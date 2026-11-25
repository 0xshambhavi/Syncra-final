# Syncra

A campus events platform with four access profiles: Student, Club President, Faculty Coordinator and Principal.

## Run locally

Requirements: Python 3.10+ and Node.js 20+.

### Backend

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

API health: http://localhost:8000/health  
API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Demo accounts

These seeded local accounts use password `syncra123`:

- `student@example.edu` — Student
- `president@example.edu` — Club President
- `faculty@example.edu` — Faculty Coordinator

## Authentication behaviour

- Student signup requires email verification before login. In local development, the verification code is returned in the signup response and shown in the UI so the flow can be tested without an email service.
- Club President signup collects club name and position, then remains pending until Principal approval.
- Faculty Coordinator signup collects department, then remains pending until Principal approval.
- Principal is not a public signup option. The institution provisions this account through `POST /api/v1/auth/provision-principal` using the `X-Admin-Key` header and a configured `SYNCRA_ADMIN_KEY`.
- Login validates credentials and account status; `/api/v1/auth/me` restores the persisted session; logout revokes the server-side session.
- Passwords are PBKDF2-SHA256 hashed. Accounts and sessions persist in SQLite at `backend/syncra_auth.db` by default.
- Set `INSTITUTION_EMAIL_DOMAINS` to a comma-separated allow-list of institutional domains. Leave it empty only for local development; no institution-specific domain is assumed by the code.

## Important limitations

The project is a local prototype. No real email delivery provider is configured, so development OTPs are exposed only when `SYNCRA_ENV=development`. Configure an email provider before deploying. Events, registrations, budgets and notifications remain in-memory demo data; only authentication accounts and sessions are persisted. Production deployment also needs HTTPS, rate limiting, secure secret management, managed database backups and authorization/security testing.
