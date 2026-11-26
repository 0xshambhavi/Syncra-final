"""President operations endpoints for the Syncra demo.
Data is intentionally in-memory like the existing event/budget demo; replace with DB tables for production.
"""
from datetime import datetime
from uuid import uuid4
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field
from .ai_agents import analyze_schedule

CLUB_MEMBERS = {
    "TEDxBMSIT&M": [
        {"id":"tedx-demo-member-1","name":"Aarav Demo","email":"aarav.demo@example.edu","role":"Core Team","club":"TEDxBMSIT&M","status":"Active","position":"Operations"},
        {"id":"tedx-demo-member-2","name":"Mira Demo","email":"mira.demo@example.edu","role":"Core Team","club":"TEDxBMSIT&M","status":"Active","position":"Curation"},
        {"id":"tedx-demo-member-3","name":"Kabir Demo","email":"kabir.demo@example.edu","role":"Member","club":"TEDxBMSIT&M","status":"Active","position":"Design"},
        {"id":"tedx-demo-member-4","name":"Anaya Demo","email":"anaya.demo@example.edu","role":"Member","club":"TEDxBMSIT&M","status":"Active","position":"Marketing"}
    ]
}

def install(app, *, current_user, require_role, EVENTS, VENUES, REGISTRATIONS, NOTIFICATIONS, db_connect):
    members = CLUB_MEMBERS
    attendance = {}
    feedback_forms = {}
    feedback_responses = {}
    volunteer_calls = {}
    volunteer_signups = {}
    coordinator_requests = {}

    def owned_event(event_id, user):
        event = EVENTS.get(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        if user["role"] == "president" and event.get("owner_club") != user.get("profile", {}).get("club_name"):
            raise HTTPException(status_code=403, detail="You can only manage your own club events")
        return event

    class MemberIn(BaseModel):
        name: str = Field(min_length=2, max_length=100)
        email: str = Field(min_length=5, max_length=160)
        role: str = Field(default="Member", max_length=50)
        phone: str | None = None

    class FeedbackIn(BaseModel):
        title: str = Field(min_length=3, max_length=120)
        questions: list[str] = Field(min_length=1, max_length=12)

    class FeedbackResponse(BaseModel):
        answers: list[str] = Field(min_length=1, max_length=12)

    class VolunteerIn(BaseModel):
        requirement: str = Field(min_length=3, max_length=300)
        slots: int = Field(default=1, gt=0, le=200)
        contact: str = Field(default="", max_length=160)

    class CoordinatorIn(BaseModel):
        faculty_email: str = Field(min_length=5, max_length=160)
        note: str = Field(default="", max_length=1000)

    class AttendanceIn(BaseModel):
        student_email: str = Field(min_length=5, max_length=160)

    @app.get("/api/v1/president/members")
    async def get_members(user=Depends(require_role("president"))):
        club = user["profile"].get("club_name")
        return members.setdefault(club, [])

    @app.post("/api/v1/president/members", status_code=201)
    async def add_member(payload: MemberIn, user=Depends(require_role("president"))):
        club = user["profile"].get("club_name")
        rows = members.setdefault(club, [])
        if any(m["email"].lower() == payload.email.lower() for m in rows):
            raise HTTPException(status_code=409, detail="This member is already in your club roster")
        item = {"id": str(uuid4()), **payload.model_dump(), "club": club, "added_at": datetime.utcnow().isoformat()}
        rows.append(item)
        return item

    @app.delete("/api/v1/president/members/{member_id}")
    async def remove_member(member_id: str, user=Depends(require_role("president"))):
        rows = members.setdefault(user["profile"].get("club_name"), [])
        before = len(rows)
        rows[:] = [m for m in rows if m["id"] != member_id]
        if len(rows) == before:
            raise HTTPException(status_code=404, detail="Member not found")
        return {"message": "Member removed"}

    @app.get("/api/v1/president/events/{event_id}/attendees")
    async def attendees(event_id: str, user=Depends(require_role("president"))):
        owned_event(event_id, user)
        ids = [uid for uid, registered in REGISTRATIONS.items() if event_id in registered]
        result = []
        with db_connect() as conn:
            for uid in ids:
                row = conn.execute("SELECT id,email,profile_json FROM users WHERE id=?", (uid,)).fetchone()
                if row:
                    import json
                    profile = json.loads(row["profile_json"] or "{}")
                    result.append({"user_id": uid, "email": row["email"], "name": profile.get("full_name", row["email"]), "checked_in": uid in attendance.setdefault(event_id, set())})
        return result

    @app.post("/api/v1/president/events/{event_id}/attendance")
    async def mark_attendance(event_id: str, payload: AttendanceIn, user=Depends(require_role("president"))):
        owned_event(event_id, user)
        with db_connect() as conn:
            row = conn.execute("SELECT id,email FROM users WHERE email=? COLLATE NOCASE AND role='student'", (payload.student_email.strip(),)).fetchone()
        if not row or event_id not in REGISTRATIONS.get(row["id"], set()):
            raise HTTPException(status_code=404, detail="No registration found for this student and event")
        attendance.setdefault(event_id, set()).add(row["id"])
        return {"message": "Attendance marked", "student_email": row["email"]}

    @app.post("/api/v1/president/events/{event_id}/feedback", status_code=201)
    async def create_feedback(event_id: str, payload: FeedbackIn, user=Depends(require_role("president"))):
        owned_event(event_id, user)
        form = {"id": str(uuid4()), "event_id": event_id, **payload.model_dump(), "created_at": datetime.utcnow().isoformat()}
        feedback_forms[event_id] = form
        return form

    @app.get("/api/v1/president/events/{event_id}/feedback")
    async def get_feedback(event_id: str, user=Depends(require_role("president"))):
        owned_event(event_id, user)
        return {"form": feedback_forms.get(event_id), "responses": feedback_responses.get(event_id, [])}

    @app.post("/api/v1/events/{event_id}/feedback")
    async def submit_feedback(event_id: str, payload: FeedbackResponse, user=Depends(require_role("student"))):
        if event_id not in EVENTS or event_id not in REGISTRATIONS.get(user["id"], set()):
            raise HTTPException(status_code=403, detail="Register for this event before submitting feedback")
        form = feedback_forms.get(event_id)
        if not form:
            raise HTTPException(status_code=404, detail="Feedback form is not available yet")
        if len(payload.answers) != len(form["questions"]):
            raise HTTPException(status_code=422, detail="Answer every feedback question")
        rows = feedback_responses.setdefault(event_id, [])
        if any(r["user_id"] == user["id"] for r in rows):
            raise HTTPException(status_code=409, detail="You have already submitted feedback")
        item = {"user_id": user["id"], "answers": payload.answers, "submitted_at": datetime.utcnow().isoformat()}
        rows.append(item)
        return {"message": "Thank you for your feedback"}

    @app.post("/api/v1/president/events/{event_id}/volunteers", status_code=201)
    async def create_volunteer_call(event_id: str, payload: VolunteerIn, user=Depends(require_role("president"))):
        owned_event(event_id, user)
        item = {"id": str(uuid4()), "event_id": event_id, **payload.model_dump(), "club": user["profile"].get("club_name"), "signups": []}
        volunteer_calls[event_id] = item
        return item

    @app.get("/api/v1/president/events/{event_id}/volunteers")
    async def get_volunteer_call(event_id: str, user=Depends(require_role("president"))):
        owned_event(event_id, user)
        return volunteer_calls.get(event_id)

    @app.post("/api/v1/events/{event_id}/volunteer")
    async def volunteer_for_event(event_id: str, user=Depends(require_role("student"))):
        call = volunteer_calls.get(event_id)
        if not call:
            raise HTTPException(status_code=404, detail="No volunteer call is open for this event")
        if user["id"] not in call["signups"]:
            call["signups"].append(user["id"])
        return {"message": "Volunteer interest recorded"}

    @app.post("/api/v1/president/events/{event_id}/coordinator-request", status_code=201)
    async def request_coordinator(event_id: str, payload: CoordinatorIn, user=Depends(require_role("president"))):
        event = owned_event(event_id, user)
        with db_connect() as conn:
            row = conn.execute("SELECT id,email,profile_json FROM users WHERE email=? COLLATE NOCASE AND role='faculty' AND status='active'", (payload.faculty_email.strip(),)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="No active faculty account matches that email")
        request = {"id": str(uuid4()), "event_id": event_id, "event_title": event["title"], "faculty_email": row["email"], "faculty_id": row["id"], "club": user["profile"].get("club_name"), "note": payload.note, "status": "pending", "requested_by": user["id"]}
        coordinator_requests[event_id] = request
        NOTIFICATIONS.setdefault(row["id"], []).append({"id": str(uuid4()), "title": "Event coordinator request", "message": f"{request['club']} requests you to coordinate {event['title']}. Awaiting your response.", "read": False, "type": "coordinator_request", "created_at": datetime.utcnow().isoformat()})
        return request

    @app.get("/api/v1/president/events/{event_id}/coordinator")
    async def get_coordinator(event_id: str, user=Depends(require_role("president"))):
        owned_event(event_id, user)
        return coordinator_requests.get(event_id)

    @app.get("/api/v1/president/clash-suggestions")
    async def clash_suggestions(user=Depends(require_role("president"))):
        club = user["profile"].get("club_name")
        return analyze_schedule(EVENTS, club)

    @app.patch("/api/v1/events/{event_id}")
    async def update_event(event_id: str, payload: dict, user=Depends(require_role("president"))):
        event = owned_event(event_id, user)
        allowed = {"title", "date", "time", "end_date", "end_time", "venue", "description", "capacity", "fee", "prize_pool"}
        unknown = set(payload) - allowed
        if unknown:
            raise HTTPException(status_code=422, detail="Unsupported event fields: " + ", ".join(sorted(unknown)))
        if "venue" in payload and payload["venue"] not in {v["name"] for v in VENUES.values()}:
            raise HTTPException(status_code=422, detail="Choose one of the five configured campus venues")
        if "capacity" in payload and int(payload["capacity"]) < event.get("registered", 0):
            raise HTTPException(status_code=422, detail="Capacity cannot be lower than existing registrations")
        event.update(payload)
        return event

    @app.delete("/api/v1/president/events/{event_id}")
    async def cancel_event(event_id: str, user=Depends(require_role("president"))):
        event = owned_event(event_id, user)
        event["status"] = "cancelled"
        for uid in REGISTRATIONS:
            if event_id in REGISTRATIONS[uid]:
                NOTIFICATIONS.setdefault(uid, []).append({"id": str(uuid4()), "title": "Event cancelled", "message": f"{event['title']} has been cancelled by its organiser.", "read": False, "type": "event_update", "created_at": datetime.utcnow().isoformat()})
        return {"message": "Event marked as cancelled", "event": event}
