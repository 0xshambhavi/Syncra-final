"""Google OAuth integrations for Syncra (Forms ingestion + per-student Calendar sync).

Required env:
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
  SYNCRA_GOOGLE_TOKEN_ENCRYPTION_KEY (Fernet key; generate with Fernet.generate_key())
OAuth tokens are encrypted at rest. Never expose them to the frontend.
"""
from __future__ import annotations
import base64, hashlib, hmac, json, os, secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from uuid import uuid4

from fastapi import Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field


SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/forms.responses.readonly",
]


def _fernet():
    from cryptography.fernet import Fernet
    key = os.getenv("SYNCRA_GOOGLE_TOKEN_ENCRYPTION_KEY", "").strip()
    if not key:
        raise HTTPException(503, "Google integrations are not configured: set SYNCRA_GOOGLE_TOKEN_ENCRYPTION_KEY.")
    try:
        return Fernet(key.encode())
    except Exception as exc:
        raise HTTPException(503, "SYNCRA_GOOGLE_TOKEN_ENCRYPTION_KEY must be a valid Fernet key.") from exc


def _oauth_config():
    client_id, client_secret = os.getenv("GOOGLE_CLIENT_ID"), os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not client_id or not client_secret or not redirect_uri:
        raise HTTPException(503, "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.")
    return {"web": {"client_id": client_id, "client_secret": client_secret, "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token", "redirect_uris": [redirect_uri]}}, redirect_uri


def _state(uid: str):
    secret = os.getenv("SYNCRA_GOOGLE_STATE_SECRET") or os.getenv("SYNCRA_ADMIN_KEY") or os.getenv("GOOGLE_CLIENT_SECRET", "")
    if not secret:
        raise HTTPException(503, "Set SYNCRA_GOOGLE_STATE_SECRET to enable secure OAuth state validation.")
    payload = base64.urlsafe_b64encode(json.dumps({"uid": uid, "nonce": secrets.token_urlsafe(20), "exp": int((datetime.now(timezone.utc)+timedelta(minutes=10)).timestamp())}).encode()).decode().rstrip("=")
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return payload + "." + sig


def _verify_state(state: str):
    try:
        payload, signature = state.rsplit(".", 1)
        secret = os.getenv("SYNCRA_GOOGLE_STATE_SECRET") or os.getenv("SYNCRA_ADMIN_KEY") or os.getenv("GOOGLE_CLIENT_SECRET", "")
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not secret or not hmac.compare_digest(signature, expected):
            raise ValueError("signature")
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if int(data["exp"]) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("expired")
        return data["uid"]
    except Exception as exc:
        raise HTTPException(400, "Google OAuth state is invalid or expired. Please connect again.") from exc


def _credentials(uid, db_connect):
    from google.oauth2.credentials import Credentials
    with db_connect() as conn:
        row = conn.execute("SELECT token_ciphertext FROM google_tokens WHERE user_id=?", (uid,)).fetchone()
    if not row:
        return None
    try:
        raw = _fernet().decrypt(row["token_ciphertext"].encode()).decode()
        data = json.loads(raw)
        return Credentials.from_authorized_user_info(data, SCOPES)
    except Exception:
        return None


def _save_credentials(uid, credentials, db_connect):
    encrypted = _fernet().encrypt(credentials.to_json().encode()).decode()
    with db_connect() as conn:
        conn.execute("""INSERT INTO google_tokens(user_id,token_ciphertext,updated_at) VALUES(?,?,?)
          ON CONFLICT(user_id) DO UPDATE SET token_ciphertext=excluded.token_ciphertext,updated_at=excluded.updated_at""",
          (uid, encrypted, datetime.now(timezone.utc).isoformat()))


def create_calendar_entry(uid: str, event: dict, db_connect):
    """Best-effort calendar insert after registration. Returns a safe status, never a token."""
    try:
        from googleapiclient.discovery import build
        creds = _credentials(uid, db_connect)
        if not creds:
            return {"status": "not_connected", "message": "Connect Google Calendar to add this event automatically."}
        if creds.expired and creds.refresh_token:
            from google.auth.transport.requests import Request as GoogleRequest
            creds.refresh(GoogleRequest())
            _save_credentials(uid, creds, db_connect)
        if not creds.valid:
            return {"status": "reconnect_required", "message": "Reconnect Google to add this event to your calendar."}
        start = f'{event["date"]}T{event["time"]}:00'
        end_date = event.get("end_date") or event["date"]
        end_time = event.get("end_time") or event["time"]
        if end_date == event["date"] and end_time == event["time"]:
            from datetime import datetime as dt, timedelta as td
            end_time = (dt.fromisoformat(start) + td(hours=1)).strftime("%H:%M")
        body = {"summary": event["title"], "description": event.get("description", "") + f'\n\nOrganised by {event.get("club","Syncra")}. Added from Syncra.', "location": event.get("venue", ""), "start": {"dateTime": f'{event["date"]}T{event["time"]}:00', "timeZone": os.getenv("SYNCRA_TIMEZONE", "Asia/Kolkata")}, "end": {"dateTime": f'{end_date}T{end_time}:00', "timeZone": os.getenv("SYNCRA_TIMEZONE", "Asia/Kolkata")}, "source": {"title": "Syncra event", "url": os.getenv("FRONTEND_URL", "http://localhost:5173") + "/app/my-events"}}
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        created = service.events().insert(calendarId="primary", body=body).execute()
        with db_connect() as conn:
            conn.execute("INSERT OR REPLACE INTO google_calendar_events(user_id,event_id,google_event_id,created_at) VALUES(?,?,?,?)", (uid, event["id"], created.get("id"), datetime.now(timezone.utc).isoformat()))
        return {"status": "added", "calendar_event_id": created.get("id")}
    except Exception:
        return {"status": "failed", "message": "Google Calendar could not add this event. Check the connection and try reconnecting."}


class FormsConfig(BaseModel):
    form_id: str = Field(min_length=8, max_length=200)


def install(app, *, current_user, require_role, db_connect, EVENTS, FEEDBACK):
    with db_connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS google_tokens(
          user_id TEXT PRIMARY KEY, token_ciphertext TEXT NOT NULL, updated_at TEXT NOT NULL)""")
        conn.execute("""CREATE TABLE IF NOT EXISTS google_forms_config(
          event_id TEXT PRIMARY KEY, form_id TEXT NOT NULL, configured_by TEXT NOT NULL, updated_at TEXT NOT NULL)""")
        conn.execute("""CREATE TABLE IF NOT EXISTS google_calendar_events(
          user_id TEXT NOT NULL, event_id TEXT NOT NULL, google_event_id TEXT NOT NULL, created_at TEXT NOT NULL,
          PRIMARY KEY(user_id,event_id))""")

    @app.get("/api/v1/integrations/google/status")
    async def google_status(user=Depends(current_user)):
        creds = _credentials(user["id"], db_connect)
        with db_connect() as conn:
            row = conn.execute("SELECT updated_at FROM google_tokens WHERE user_id=?", (user["id"],)).fetchone()
        return {"connected": bool(creds), "updated_at": row["updated_at"] if row else None, "scopes": SCOPES if creds else []}

    @app.post("/api/v1/integrations/google/connect-url")
    async def google_connect_url(user=Depends(current_user)):
        from google_auth_oauthlib.flow import Flow
        config, redirect_uri = _oauth_config()
        flow = Flow.from_client_config(config, scopes=SCOPES, redirect_uri=redirect_uri)
        state = _state(user["id"])
        url, _ = flow.authorization_url(access_type="offline", include_granted_scopes="true", prompt="consent", state=state)
        return {"authorization_url": url}

    @app.get("/api/v1/integrations/google/connect")
    async def google_connect(user=Depends(current_user)):
        result = await google_connect_url(user)
        return RedirectResponse(result["authorization_url"])

    @app.get("/api/v1/integrations/google/callback")
    async def google_callback(request: Request, state: str = "", code: str = "", error: str = ""):
        if error:
            raise HTTPException(400, "Google authorization was not completed.")
        uid = _verify_state(state)
        from google_auth_oauthlib.flow import Flow
        config, redirect_uri = _oauth_config()
        flow = Flow.from_client_config(config, scopes=SCOPES, redirect_uri=redirect_uri, state=state)
        flow.fetch_token(code=code)
        _save_credentials(uid, flow.credentials, db_connect)
        return RedirectResponse(os.getenv("FRONTEND_URL", "http://localhost:5173") + "/app/settings?google=connected")

    @app.delete("/api/v1/integrations/google")
    async def google_disconnect(user=Depends(current_user)):
        with db_connect() as conn:
            conn.execute("DELETE FROM google_tokens WHERE user_id=?", (user["id"],))
            conn.execute("DELETE FROM google_calendar_events WHERE user_id=?", (user["id"],))
        return {"connected": False}

    @app.put("/api/v1/president/analytics/events/{event_id}/google-form")
    async def configure_form(event_id: str, payload: FormsConfig, user=Depends(require_role("president"))):
        event = EVENTS.get(event_id)
        if not event or (event.get("owner_club") or event.get("club","")).casefold() != user.get("profile",{}).get("club_name","").casefold():
            raise HTTPException(404, "Event not found in your club.")
        if not _credentials(user["id"], db_connect):
            raise HTTPException(409, "Connect Google first, then attach the event's Google Form.")
        with db_connect() as conn:
            conn.execute("INSERT INTO google_forms_config(event_id,form_id,configured_by,updated_at) VALUES(?,?,?,?) ON CONFLICT(event_id) DO UPDATE SET form_id=excluded.form_id,configured_by=excluded.configured_by,updated_at=excluded.updated_at", (event_id,payload.form_id.strip(),user["id"],datetime.now(timezone.utc).isoformat()))
        return {"configured": True, "event_id": event_id}

    @app.post("/api/v1/president/analytics/events/{event_id}/google-form/sync")
    async def sync_form(event_id: str, user=Depends(require_role("president"))):
        event = EVENTS.get(event_id)
        if not event or (event.get("owner_club") or event.get("club","")).casefold() != user.get("profile",{}).get("club_name","").casefold():
            raise HTTPException(404, "Event not found in your club.")
        creds = _credentials(user["id"], db_connect)
        if not creds:
            raise HTTPException(409, "Connect Google before syncing Forms responses.")
        with db_connect() as conn:
            cfg = conn.execute("SELECT form_id FROM google_forms_config WHERE event_id=?", (event_id,)).fetchone()
        if not cfg:
            raise HTTPException(404, "No Google Form is configured for this event.")
        try:
            from googleapiclient.discovery import build
            if creds.expired and creds.refresh_token:
                from google.auth.transport.requests import Request as GoogleRequest
                creds.refresh(GoogleRequest())
                _save_credentials(user["id"], creds, db_connect)
            forms = build("forms", "v1", credentials=creds, cache_discovery=False)
            form = forms.forms().get(formId=cfg["form_id"]).execute()
            questions = {}
            for item in form.get("items", []):
                question = item.get("questionItem", {}).get("question", {})
                if question.get("questionId"):
                    questions[question["questionId"]] = item.get("title", "")
            response_page = forms.forms().responses().list(formId=cfg["form_id"], pageSize=500).execute()
            imported = 0
            for response in response_page.get("responses", []):
                answers = response.get("answers", {})
                values = []
                for qid, answer in answers.items():
                    title = questions.get(qid, "").casefold()
                    text_value = " ".join(v.get("value", "") for v in answer.get("textAnswers", {}).get("answers", []))
                    values.append((title, text_value))
                combined = " ".join(v for _,v in values).casefold()
                rating_text = next((v for k,v in values if any(x in k for x in ("rating","rate","overall"))), "")
                import re
                match = re.search(r"\b([1-5](?:\.\d+)?)\b", rating_text)
                if not match:
                    continue
                role_text = next((v for k,v in values if any(x in k for x in ("role","respondent","audience","type"))), "guest").casefold()
                source = "faculty" if any(x in role_text for x in ("faculty","teacher")) else "student" if "student" in role_text else "guest"
                comment = next((v for k,v in values if any(x in k for x in ("comment","feedback","suggest","improv","experience"))), "")
                response_id = response.get("responseId")
                rows = FEEDBACK.setdefault(event_id, [])
                if any(r.get("source_response_id") == response_id for r in rows):
                    continue
                rows.append({"id": str(uuid4()), "event_id": event_id, "source": source, "respondent": "Google Forms respondent", "rating": float(match.group(1)), "comments": comment[:3000], "category": "overall", "source_response_id": response_id, "submitted_at": response.get("lastSubmittedTime") or datetime.now(timezone.utc).isoformat()})
                imported += 1
            return {"imported": imported, "total_responses_seen": len(response_page.get("responses", [])), "form_title": form.get("info", {}).get("title"), "message": "Responses synced. Existing response IDs are deduplicated."}
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(502, "Google Forms sync failed. Check the Form ID, sharing permissions and OAuth scopes.") from exc
