# Syncra

**A campus events coordination platform for students, club presidents, faculty coordinators and principals.**

Syncra brings campus events, registrations, club operations and institutional approvals into one workspace. Its core idea is to move beyond simply listing events: it helps teams identify scheduling conflicts, consider collaboration opportunities and coordinate event decisions.

> **Project status:** Working prototype / staging deployment. This repository is not yet production-ready. Read [Limitations](#limitations-before-real-campus-use) before using real student or institutional data.

## What Syncra includes

| Workspace | Current capabilities |
| --- | --- |
| **Student** | Browse campus events, view event details, register, manage My Events, explore clubs, view notifications and update a profile. |
| **Club President** | Manage club events, review clash and collaboration suggestions, work with venue options, manage members and volunteers, submit budgets and use the AI event reader. |
| **Faculty Coordinator** | Review assigned-club activity, view members and events, and review budget requests with approval, reduction, revision or rejection actions. |
| **Principal** | Campus-wide oversight, budget review and faculty-account approval workflows. |

### Coordination and AI features

- Rule-based event clash checks and suggested alternatives.
- Advisory event collaboration scoring.
- Budget review workflows with human approval decisions.
- Optional OpenAI-powered event information extraction and written assistance.
- Google Calendar integration endpoints and a local fallback path where configured.

AI assistance is advisory: people remain responsible for event, budget and approval decisions.

## Tech stack

- **Frontend:** React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS and Recharts.
- **Backend:** Python, FastAPI and Pydantic.
- **Authentication persistence:** SQLite for accounts and sessions.
- **Optional integrations:** Google Calendar API and OpenAI.

## Repository layout

```text
.
├── backend/
│   ├── app/              # FastAPI application and feature modules
│   ├── .env.example      # Backend configuration template
│   └── requirements.txt
├── frontend/
│   ├── src/              # React application
│   └── package.json
├── docs/                 # Integration and setup notes
├── .env.example
└── README.md
```

## Run locally

**Requirements:** Python 3.10+ and Node.js 20+.

### 1. Clone and prepare the backend

```bash
git clone https://github.com/0xshambhavi/Syncra-final.git
cd Syncra-final
python -m venv .venv
```

Activate the environment:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS / Linux
source .venv/bin/activate
```

Install backend dependencies and start the API:

```bash
pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

The API is available at:

- Health check: [http://localhost:8000/health](http://localhost:8000/health)
- Interactive API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Start the frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The frontend uses `VITE_API_URL` when provided; otherwise it defaults to `http://localhost:8000`.

## Configuration

Copy `backend/.env.example` to `backend/.env` and set only the integrations you intend to use. Keep this file local and never commit it.

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client credentials. |
| `GOOGLE_REDIRECT_URI` | Must exactly match the redirect URI configured in Google Cloud. |
| `SYNCRA_GOOGLE_TOKEN_ENCRYPTION_KEY` | Fernet key used to encrypt stored Google tokens. |
| `SYNCRA_GOOGLE_STATE_SECRET` | Secret used to sign OAuth state. |
| `SYNCRA_TIMEZONE` | Application timezone; default is `Asia/Kolkata`. |
| `OPENAI_API_KEY` | Optional key for OpenAI-backed features. |
| `LLM_ENABLED` | Enables or disables LLM features; default is `false`. |
| `LLM_MODEL` | Model name; default is `gpt-4.1-mini`. |

For a local-only run, Google and OpenAI credentials can remain unset. Do not paste secrets into issues, pull requests or source files.

## Demo access and workflows

The local demo seeds these accounts with the password `syncra123`:

| Account | Role |
| --- | --- |
| `student@example.edu` | Student |
| `faculty@example.edu` | Faculty Coordinator |

Club President and Principal accounts are restricted and must be provisioned by an administrator; they are not public demo sign-ups.

A useful walkthrough:

1. Sign in as a student and browse the event calendar.
2. Open an event, register and inspect the My Events and notification views.
3. Sign in as a club president (using a provisioned account) and create or edit an event.
4. Review any clash warning and collaboration suggestion.
5. Submit a budget request and review it from the faculty or principal workflow.

## Deployment

The current staging setup uses:

- **Frontend:** Render Static Site — `https://syncra-frontend.onrender.com`
- **Backend:** Render Web Service — `https://syncra-api-baog.onrender.com`
- **Deployment branch:** `pseudo-main`

The frontend is configured to call the backend using `VITE_API_URL`. The backend CORS allow-list includes the staging frontend origin. These are staging endpoints, not a production service-level guarantee.

## Limitations before real campus use

Syncra is a prototype and must not be treated as a production student-information system yet.

- Event, registration, notification, budget and several operational records are held in in-memory demo stores and can reset when the backend restarts.
- Authentication accounts and sessions are stored in a local SQLite database. A production deployment needs a managed persistent database, backups and a migration strategy.
- A real email delivery provider is not configured. Do not rely on development OTP behavior for real account verification.
- Payment processing is not a live payment integration.
- Replace synthetic event links, sample QR targets, demo speaker details and illustrative budget values with verified information before any public campus launch.
- Complete authorization and security testing, rate limiting, audit logging, accessibility checks, monitoring and incident-response preparation.
- Configure production secrets and HTTPS-only OAuth redirect URLs. Never use demo credentials or real student data in a public demo.

## Project direction

The original product brief prioritises the landing page, role-based authentication, student experience, president operations, faculty/principal approvals, clash and collaboration coordination, budgets and notifications. Instagram insights, feedback collection, event score reports and club-health reporting were reserved as teammate-owned modules rather than part of the core build.

See `docs/` for integration-specific notes. Contributions should use focused feature branches and pull requests into `main`; keep secrets and real student data out of Git.
