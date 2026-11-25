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
- `faculty@example.edu` — Faculty Coordinator

## Authentication behaviour

- Student signup requires email verification before login. In local development, the verification code is returned in the signup response and shown in the UI so the flow can be tested without an email service.
- Club President self-signup is disabled. The institution provisions each club president through `POST /api/v1/admin/provision-president` using `X-Admin-Key`; each account is bound to one of the six configured clubs.
- Faculty Coordinator signup collects department, then remains pending until Principal approval.
- Principal is not a public signup option. The institution provisions this account through `POST /api/v1/auth/provision-principal` using the `X-Admin-Key` header and a configured `SYNCRA_ADMIN_KEY`.
- Login validates credentials and account status; `/api/v1/auth/me` restores the persisted session; logout revokes the server-side session.
- Passwords are PBKDF2-SHA256 hashed. Accounts and sessions persist in SQLite at `backend/syncra_auth.db` by default.
- Set `INSTITUTION_EMAIL_DOMAINS` to a comma-separated allow-list of institutional domains. Leave it empty only for local development; no institution-specific domain is assumed by the code.

## Important limitations

The project is a local prototype. No real email delivery provider is configured, so development OTPs are exposed only when `SYNCRA_ENV=development`. Configure an email provider before deploying. Events, registrations, budgets and notifications remain in-memory demo data; only authentication accounts and sessions are persisted. Production deployment also needs HTTPS, rate limiting, secure secret management, managed database backups and authorization/security testing.


## Student portal demo data

The local demo API seeds four December 2026 events: the NODE 24-hour hackathon (Dec 4–5), Alterino debugging event (Dec 25), TEDxBMSIT&M (Dec 27), and Code Red '26 (Dec 27–28). Community invite URLs and the TEDx registration QR target are sample placeholders and must be replaced with verified organiser links before a real launch. Demo speaker profiles are fictional placeholders.

Student profile updates are available through `PUT /api/v1/profile`. The student's USN must match the local part of their verified `@bmsit.in` email. Profile images may be uploaded as small PNG/JPEG/WebP data URLs (1.5 MB UI limit) or supplied as an image URL.

## President, Faculty and Principal workflows

- Six club workspaces are configured: TEDxBMSIT&M, NODE, Web3, AR/VR Club, E-Cell and Alterino. Access Denied is intentionally excluded.
- President accounts are invitation-only and must be provisioned by an administrator. Use a unique email and strong password per president; no shared demo president password is created.
- Set `SYNCRA_ADMIN_KEY` in `backend/.env` to a long random secret. Set `INSTITUTION_EMAIL_DOMAINS=bmsit.in` (or the institution's actual approved domains).
- Provision a president with `POST /api/v1/admin/provision-president`, JSON body `{"email":"club-president@bmsit.in","password":"use-a-unique-strong-password","full_name":"President Name","club_name":"NODE"}`, and header `X-Admin-Key: <SYNCRA_ADMIN_KEY>`.
- President users can create events only for their assigned club and submit itemised INR budget requests. Faculty and Principal review pending events and budgets; Principal also approves Faculty access requests.
- Demo budget values are synthetic estimates in INR, are marked as demo data, and must not be treated as real approved allocations.
- The President workspace includes an OpenAI event reader. It accepts pasted event text or public HTTPS pages. It extracts only information found in the source and flags missing details; it does not automatically publish or approve events.
- Configure `OPENAI_API_KEY`, `LLM_ENABLED=true`, `LLM_PROVIDER=openai`, and `LLM_MODEL=gpt-4.1-mini` in `backend/.env`. Never commit that file. The AI endpoint is `POST /api/v1/ai/event-reader`.

## Prototype limitations

Event, registration, notification and budget records are still in-memory demo data and reset when the backend restarts. The AI page reader is a prototype with basic public-HTTPS checks, not a hardened production crawler. Before real campus use, move operational data to a persistent database, add audit trails and finer-grained approval rules, and complete security, accessibility and integration testing.
