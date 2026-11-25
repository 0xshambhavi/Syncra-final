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


## Student portal demo data and event assistant

The local demo API seeds four December 2026 events: the NODE 24-hour hackathon (Dec 4–5), Alterino debugging event (Dec 25), TEDxBMSIT&M (Dec 27), and Code Red '26 (Dec 27–28). Community invite URLs and the TEDx registration QR target are sample placeholders and must be replaced with verified organiser links before a real launch. Demo speaker profiles are fictional placeholders.

Student profile updates are available through `PUT /api/v1/profile`. The student's USN must match the local part of their verified `@bmsit.in` email. Profile images may be uploaded as small PNG/JPEG/WebP data URLs (1.5 MB UI limit) or supplied as an image URL.

### Optional AI event assistant

The event assistant endpoint is `POST /api/v1/agent/event-assistant`. Without an AI provider, it returns a grounded summary of stored event data and clearly identifies that the AI provider is not configured. To enable model-generated answers, set these environment variables before starting the backend:

- `SYNCRA_AI_BASE_URL`: OpenAI-compatible API base URL (for example, the provider's `/v1` base)
- `SYNCRA_AI_API_KEY`: API key (keep it private; never commit it)
- `SYNCRA_AI_MODEL`: model identifier supported by that provider

The server sends only the user's question and the selected event's stored fields to the configured chat-completions endpoint. Answers are instructed to use only supplied event facts and disclose missing information. Schedule conflict detection is deterministic backend logic and does not depend on the AI provider.
