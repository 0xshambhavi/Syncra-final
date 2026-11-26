# Google + AI integrations setup

## Google Cloud setup

1. Create/select a Google Cloud project and enable **Google Calendar API** and **Google Forms API**.
2. Configure the OAuth consent screen for your institution. Add the required test users while the app is in testing.
3. Create an OAuth 2.0 **Web application** client.
4. Add the exact backend callback URI, for local development: `http://localhost:8000/api/v1/integrations/google/callback`.
5. Put the client ID and secret in the backend environment only. Never commit credentials or send them to the browser.

Generate an encryption key for stored OAuth tokens:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Backend environment variables:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/integrations/google/callback
SYNCRA_GOOGLE_TOKEN_ENCRYPTION_KEY=
SYNCRA_GOOGLE_STATE_SECRET=
SYNCRA_TIMEZONE=Asia/Kolkata
FRONTEND_URL=http://localhost:5173
OPENAI_API_KEY=
LLM_ENABLED=false
LLM_MODEL=gpt-4.1-mini
```

Restart the backend after adding variables.

## Student Google Calendar

Each student connects their own Google account from Syncra. OAuth requests the `calendar.events` scope. After a successful student registration, Syncra attempts to create an event in that student's primary calendar. The registration succeeds even if Calendar is not connected or Google is temporarily unavailable; the API returns a `calendar_sync` status. Students can disconnect from Google at any time.

## Google Forms feedback

1. Connect the club president's Google account in Syncra.
2. Create a Google Form for event feedback. Include questions identifying respondent audience (Student / Faculty / Guest), an overall rating on a 1–5 scale, and written feedback/comments.
3. Copy the Form ID from its URL (the value between `/d/` and `/edit`).
4. Attach it to the event with `PUT /api/v1/president/analytics/events/{event_id}/google-form`, body `{"form_id":"YOUR_FORM_ID"}`.
5. Trigger `POST /api/v1/president/analytics/events/{event_id}/google-form/sync` to import new responses. Repeated syncs deduplicate by Google Forms response ID.

The Google account used to connect must have access to the Form. Forms API access is read-only. The sync endpoint is ready for a scheduled background job; this first implementation uses an explicit sync trigger rather than claiming an always-on webhook.

## AI clash and collaboration agent

The president clash-suggestions endpoint now uses an AI-assisted analysis when `LLM_ENABLED=true` and `OPENAI_API_KEY` is configured. It always validates model suggestions against the deterministic event pairs; otherwise it returns rule-based suggestions. It never changes event dates, venues or approvals automatically.

## Important production work still required

- The demo event, registration, feedback and analytics stores are still partly in-memory. Move these to persistent database tables before production.
- Configure OAuth consent screen publishing, institutional domain restrictions, privacy notice and retention policy.
- Add scheduled Forms sync (e.g. a background worker) and retry monitoring for production.
- Validate event time zones and update/delete corresponding Google Calendar entries when organisers modify/cancel events.
- Use HTTPS and a production frontend/backend domain for OAuth redirect URIs.
