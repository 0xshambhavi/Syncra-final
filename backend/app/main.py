"""Syncra demo API. Uses in-memory storage so it runs without external services.
For production, replace the demo auth/store with Supabase and enforce database RLS.
"""
from datetime import datetime, timezone, timedelta
from typing import Literal
from uuid import uuid4
from pathlib import Path
from contextlib import contextmanager
import hashlib, hmac, json, os, secrets, sqlite3

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

app = FastAPI(title="Syncra API", version="1.0.0", description="Local demo API for the Syncra campus events platform")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Authentication data is persisted independently from the in-memory event demo.
DB_PATH = Path(os.getenv("SYNCRA_DB_PATH", str(Path(__file__).resolve().parents[2] / "syncra_auth.db")))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
SESSION_HOURS = max(1, int(os.getenv("SESSION_HOURS", "72")))
PBKDF2_ITERATIONS = 310_000
USERS: dict[str, dict] = {}
TOKENS: dict[str, str] = {}
PASSWORDS: dict[str, str] = {}
EVENTS: dict[str, dict] = {
    "event-art-talk": {"id":"event-art-talk","title":"Art Talk","club":"Art Club","date":"2026-12-04","time":"14:00","venue":"Auditorium A","description":"A conversation about creativity and design.","capacity":120,"registered":38,"status":"approved"},
    "event-hackathon": {"id":"event-hackathon","title":"Tech Hackathon","club":"Tech Club","date":"2026-12-08","time":"09:00","venue":"Innovation Lab","description":"Build, learn and collaborate in a campus hackathon.","capacity":80,"registered":54,"status":"approved"},
}
BUDGETS: dict[str, dict] = {}
NOTIFICATIONS: dict[str, list[dict]] = {}
VENUES: dict[str, dict] = {
    "auditorium-a":{"id":"auditorium-a","name":"Auditorium A","type":"auditorium","capacity":250,"building":"Main Block","floor":"Ground","bookable":True},
    "innovation-lab":{"id":"innovation-lab","name":"Innovation Lab","type":"lab","capacity":100,"building":"Technology Block","floor":"2","bookable":True},
}

@contextmanager
def db_connect():
    conn=sqlite3.connect(DB_PATH, timeout=15); conn.row_factory=sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn; conn.commit()
    except Exception:
        conn.rollback(); raise
    finally: conn.close()

def hash_password(password: str):
    salt=secrets.token_bytes(16)
    digest=hashlib.pbkdf2_hmac("sha256",password.encode("utf-8"),salt,PBKDF2_ITERATIONS)
    return salt.hex(),digest.hex()

def verify_password(password: str,salt_hex: str,expected_hash: str):
    actual=hashlib.pbkdf2_hmac("sha256",password.encode("utf-8"),bytes.fromhex(salt_hex),PBKDF2_ITERATIONS).hex()
    return hmac.compare_digest(actual,expected_hash)

def public_user(row):
    return {"id":row["id"],"email":row["email"],"role":row["role"],"student_id":row["student_id"],
            "status":row["status"],"email_verified":bool(row["email_verified"]),
            "profile":json.loads(row["profile_json"] or "{}")}

def init_auth_db():
    with db_connect() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS users(
          id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          role TEXT NOT NULL CHECK(role IN ('student','president','faculty','principal','admin')),
          student_id TEXT,password_salt TEXT NOT NULL,password_hash TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',email_verified INTEGER NOT NULL DEFAULT 1,
          profile_json TEXT NOT NULL DEFAULT '{}',verification_code_hash TEXT,created_at TEXT NOT NULL)""")
        existing={r[1] for r in conn.execute("PRAGMA table_info(users)")}
        for col,decl in {"status":"TEXT NOT NULL DEFAULT 'active'","email_verified":"INTEGER NOT NULL DEFAULT 1",
                         "profile_json":"TEXT NOT NULL DEFAULT '{}'","verification_code_hash":"TEXT"}.items():
            if col not in existing: conn.execute("ALTER TABLE users ADD COLUMN "+col+" "+decl)
        conn.execute("""CREATE TABLE IF NOT EXISTS sessions(
          token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TEXT NOT NULL,created_at TEXT NOT NULL)""")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)")
        for email,role in [("student@example.edu","student"),("president@example.edu","president"),("faculty@example.edu","faculty")]:
            if not conn.execute("SELECT 1 FROM users WHERE email=?",(email,)).fetchone():
                uid=str(uuid4()); salt,digest=hash_password("syncra123")
                conn.execute("INSERT INTO users(id,email,role,password_salt,password_hash,status,email_verified,profile_json,created_at) VALUES(?,?,?,?,?,'active',1,'{}',?)",
                             (uid,email,role,salt,digest,datetime.now(timezone.utc).isoformat()))

def create_session(uid: str):
    token=secrets.token_urlsafe(36); now=datetime.now(timezone.utc)
    with db_connect() as conn:
        conn.execute("INSERT INTO sessions(token,user_id,expires_at,created_at) VALUES(?,?,?,?)",
                     (token,uid,(now+timedelta(hours=SESSION_HOURS)).isoformat(),now.isoformat()))
    return token

init_auth_db()

class Signup(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8,max_length=128)
    role: Literal["student","president","faculty"]="student"
    student_id: str|None=Field(default=None,max_length=64)
    full_name: str=Field(min_length=2,max_length=100)
    department: str|None=Field(default=None,max_length=120)
    club_name: str|None=Field(default=None,max_length=120)
    position: str|None=Field(default=None,max_length=100)
class VerifyEmail(BaseModel):
    email: EmailStr
    code: str=Field(min_length=6,max_length=6)
class Login(BaseModel):
    email: EmailStr
    password: str=Field(min_length=1,max_length=128)
class ProvisionPrincipal(BaseModel):
    email: EmailStr
    password: str=Field(min_length=12,max_length=128)
    full_name: str=Field(min_length=2,max_length=100)
class EventCreate(BaseModel):
    title: str=Field(min_length=3,max_length=120)
    club: str="Campus Club"
    date: str
    time: str
    venue: str
    description: str=""
    capacity: int=Field(default=100,gt=0)
class BudgetItem(BaseModel):
    category: Literal["venue","food","prizes","marketing","equipment","honorarium","misc"]
    amount: float=Field(gt=0)
    justification: str=""
class BudgetRequest(BaseModel):
    event_id: str
    total_amount: float=Field(gt=0)
    items: list[BudgetItem]
    remarks: str|None=None

def validate_institution_email(email: str):
    domains=[d.strip().lower().lstrip("@") for d in os.getenv("INSTITUTION_EMAIL_DOMAINS","").split(",") if d.strip()]
    if domains and email.rsplit("@",1)[-1] not in domains:
        raise HTTPException(status_code=422,detail="Use your institution-issued email address")

async def current_user(authorization: str|None=Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401,detail="Please log in to continue")
    token=authorization.split(" ",1)[1].strip(); now=datetime.now(timezone.utc)
    with db_connect() as conn:
        row=conn.execute("SELECT users.*,sessions.expires_at FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=?",(token,)).fetchone()
        if not row: raise HTTPException(status_code=401,detail="Session expired. Please log in again")
        if datetime.fromisoformat(row["expires_at"])<=now:
            conn.execute("DELETE FROM sessions WHERE token=?",(token,))
            raise HTTPException(status_code=401,detail="Your session expired. Please log in again")
    return public_user(row)

def require_role(*roles: str):
    async def checker(user: dict=Depends(current_user)):
        if user["role"] not in roles: raise HTTPException(status_code=403,detail="Your account does not have permission for this action")
        return user
    return checker

@app.get("/")
async def root(): return {"name":"Syncra API","status":"ok","docs":"/docs"}
@app.get("/health")
async def health(): return {"status":"healthy","timestamp":datetime.now(timezone.utc).isoformat()}

@app.post("/api/v1/auth/signup",status_code=201)
async def signup(payload: Signup):
    email=str(payload.email).strip().lower(); validate_institution_email(email)
    if payload.role=="president" and (not payload.club_name or not payload.position):
        raise HTTPException(status_code=422,detail="Club name and position are required for Club President access")
    if payload.role=="faculty" and not payload.department:
        raise HTTPException(status_code=422,detail="Department is required for Faculty Coordinator access")
    code=f"{secrets.randbelow(1000000):06d}" if payload.role=="student" else None
    status_value="pending_verification" if code else "pending_approval"
    uid=str(uuid4()); salt,digest=hash_password(payload.password); now=datetime.now(timezone.utc).isoformat()
    profile={"full_name":payload.full_name,"department":payload.department,"club_name":payload.club_name,"position":payload.position}
    code_hash=hashlib.sha256(code.encode()).hexdigest() if code else None
    try:
        with db_connect() as conn:
            conn.execute("INSERT INTO users(id,email,role,student_id,password_salt,password_hash,status,email_verified,profile_json,verification_code_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
              (uid,email,payload.role,payload.student_id,salt,digest,status_value,0,json.dumps(profile),code_hash,now))
    except sqlite3.IntegrityError: raise HTTPException(status_code=409,detail="An account with this email already exists")
    result={"message":"Verification required" if code else "Your access request has been submitted for approval","status":status_value,"email":email}
    if code and os.getenv("SYNCRA_ENV","development").lower()=="development": result["development_verification_code"]=code
    return result

@app.post("/api/v1/auth/verify-email")
async def verify_email(payload: VerifyEmail):
    email=str(payload.email).strip().lower(); supplied=hashlib.sha256(payload.code.encode()).hexdigest()
    with db_connect() as conn:
        row=conn.execute("SELECT * FROM users WHERE email=? COLLATE NOCASE",(email,)).fetchone()
        if not row or row["role"]!="student" or row["status"]!="pending_verification":
            raise HTTPException(status_code=400,detail="No pending student email verification was found")
        if not row["verification_code_hash"] or not hmac.compare_digest(supplied,row["verification_code_hash"]):
            raise HTTPException(status_code=400,detail="That verification code is incorrect")
        conn.execute("UPDATE users SET email_verified=1,status='active',verification_code_hash=NULL WHERE id=?",(row["id"],))
        updated=conn.execute("SELECT * FROM users WHERE id=?",(row["id"],)).fetchone()
    user=public_user(updated)
    return {"access_token":create_session(user["id"]),"token_type":"bearer","user":user}

@app.post("/api/v1/auth/login")
async def login(payload: Login):
    email=str(payload.email).strip().lower()
    with db_connect() as conn: row=conn.execute("SELECT * FROM users WHERE email=? COLLATE NOCASE",(email,)).fetchone()
    if not row or not verify_password(payload.password,row["password_salt"],row["password_hash"]):
        raise HTTPException(status_code=401,detail="Invalid email or password. Check your details or create an account first.")
    if row["status"]=="pending_verification": raise HTTPException(status_code=403,detail="Please verify your institutional email before logging in")
    if row["status"]=="pending_approval": raise HTTPException(status_code=403,detail="Your profile is awaiting approval by the Principal")
    if row["status"]!="active": raise HTTPException(status_code=403,detail="This account is not active. Contact your institution administrator.")
    return {"access_token":create_session(row["id"]),"token_type":"bearer","user":public_user(row)}

@app.post("/api/v1/auth/provision-principal",status_code=201)
async def provision_principal(payload: ProvisionPrincipal,x_admin_key: str|None=Header(default=None)):
    expected=os.getenv("SYNCRA_ADMIN_KEY")
    if not expected or not x_admin_key or not hmac.compare_digest(expected,x_admin_key):
        raise HTTPException(status_code=403,detail="A valid institution administrator key is required")
    email=str(payload.email).strip().lower(); validate_institution_email(email)
    uid=str(uuid4()); salt,digest=hash_password(payload.password); now=datetime.now(timezone.utc).isoformat()
    try:
        with db_connect() as conn:
            conn.execute("INSERT INTO users(id,email,role,password_salt,password_hash,status,email_verified,profile_json,created_at) VALUES(?,?,'principal',?,?,'active',1,?,?)",
              (uid,email,salt,digest,json.dumps({"full_name":payload.full_name}),now))
    except sqlite3.IntegrityError: raise HTTPException(status_code=409,detail="An account with this email already exists")
    return {"message":"Principal account provisioned","email":email,"role":"principal"}

@app.get("/api/v1/admin/access-requests")
async def access_requests(user: dict=Depends(require_role("principal"))):
    with db_connect() as conn: rows=conn.execute("SELECT * FROM users WHERE status='pending_approval' ORDER BY created_at").fetchall()
    return [public_user(row) for row in rows]

@app.post("/api/v1/admin/access-requests/{user_id}/approve")
async def approve_access_request(user_id: str,user: dict=Depends(require_role("principal"))):
    with db_connect() as conn: result=conn.execute("UPDATE users SET status='active',email_verified=1 WHERE id=? AND status='pending_approval'",(user_id,))
    if result.rowcount==0: raise HTTPException(status_code=404,detail="Pending access request not found")
    return {"message":"Access request approved"}

@app.get("/api/v1/auth/me")
async def me(user: dict=Depends(current_user)): return user

@app.post("/api/v1/auth/logout")
async def logout(authorization: str|None=Header(default=None)):
    if authorization and authorization.lower().startswith("bearer "):
        token=authorization.split(" ",1)[1].strip()
        with db_connect() as conn: conn.execute("DELETE FROM sessions WHERE token=?",(token,))
    return {"message":"Signed out successfully"}

@app.get("/api/v1/public/events")
async def public_events():
    return list(EVENTS.values())

@app.get("/api/v1/events")
async def events(user: dict = Depends(current_user)):
    return list(EVENTS.values())

@app.post("/api/v1/events", status_code=201)
async def create_event(payload: EventCreate, user: dict = Depends(require_role("president", "faculty"))):
    event_id = str(uuid4())
    event = {"id": event_id, **payload.model_dump(), "registered": 0, "status": "pending", "created_by": user["id"]}
    EVENTS[event_id] = event
    return event

@app.post("/api/v1/events/{event_id}/register")
async def register_event(event_id: str, user: dict = Depends(require_role("student", "president", "faculty"))):
    event = EVENTS.get(event_id)
    if not event: raise HTTPException(status_code=404, detail="Event not found")
    if event["registered"] >= event["capacity"]: raise HTTPException(status_code=409, detail="This event is full")
    event["registered"] += 1
    return {"message": "Registration successful", "event": event}

@app.get("/api/v1/my/events")
async def my_events(user: dict = Depends(current_user)):
    return [e for e in EVENTS.values() if e.get("created_by") == user["id"]]

@app.post("/api/v1/budget/request", status_code=201)
async def submit_budget(request: BudgetRequest, user: dict = Depends(require_role("president"))):
    if request.event_id not in EVENTS: raise HTTPException(status_code=404, detail="Event not found")
    ceilings = {"venue": 2000, "food": 1000, "prizes": 800, "marketing": 500, "equipment": 700, "honorarium": 600, "misc": 300}
    recommendations = [{"action": "reduce", "reason": f"{i.category.title()} exceeds the suggested ${ceilings[i.category]:,.0f} limit"} for i in request.items if i.amount > ceilings[i.category]]
    if request.total_amount > 5000: recommendations.append({"action": "revision", "reason": "Total budget exceeds the suggested $5,000 limit"})
    if not recommendations: recommendations = [{"action": "approve", "reason": "Budget is within the suggested limits"}]
    result = {**request.model_dump(), "status": "pending", "recommendations": recommendations, "submitted_by": user["id"]}
    BUDGETS[request.event_id] = result
    return result

@app.get("/api/v1/budget/requests")
async def list_budgets(user: dict = Depends(require_role("faculty"))):
    return list(BUDGETS.values())

@app.get("/api/v1/budget/request/{event_id}")
async def get_budget(event_id: str, user: dict = Depends(current_user)):
    result = BUDGETS.get(event_id)
    if not result: raise HTTPException(status_code=404, detail="Budget not found")
    return result

@app.post("/api/v1/budget/decision/{event_id}")
async def budget_decision(event_id: str, decision: Literal["approve", "reduce", "revision", "reject"] = "approve", user: dict = Depends(require_role("faculty"))):
    result = BUDGETS.get(event_id)
    if not result: raise HTTPException(status_code=404, detail="Budget not found")
    result["status"] = decision
    return {"message": f"Budget {decision}", "budget": result}

@app.get("/api/v1/notifications")
async def notifications(user: dict = Depends(current_user)):
    return NOTIFICATIONS.get(user["id"], [])

@app.post("/api/v1/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(current_user)):
    item = next((n for n in NOTIFICATIONS.get(user["id"], []) if n["id"] == notification_id), None)
    if not item: raise HTTPException(status_code=404, detail="Notification not found")
    item["read"] = True
    return item

@app.get("/api/v1/venues")
async def list_venues(user: dict = Depends(current_user)):
    return list(VENUES.values())
