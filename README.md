# BIGFAT AI CRM

Tutterfly — a multi-tenant, multi-industry CRM.
Backend: FastAPI + Beanie/MongoDB (`apps/backend`). Frontend: Next.js App Router (`apps/frontend`).

## New here?

| If you… | Read |
|---|---|
| Don't have the code yet | **[docs/SYSTEM_HANDBOOK.md](docs/SYSTEM_HANDBOOK.md)** — fully self-contained: every collection's fields, the data flow, permissions, and the rules, all inlined |
| Have the repo checked out | **[docs/SCHEMA_AND_DATA_FLOW.md](docs/SCHEMA_AND_DATA_FLOW.md)** — the same material as a guided reading path with links into the source |
| Are about to write code | **[CLAUDE.md](CLAUDE.md)** — the engineering rules enforced in review |

## Running locally

Quick start (one command, both services):

```bash
npm run install:all   # frontend deps + backend pip install
npm run dev           # frontend :3000 + backend :8000
```

Or run each service manually in its own terminal:

**Backend** — from `apps/backend`:

```powershell
PS C:\Users\ABHINEET\Desktop\Tutterfly\apps\backend> pip install -r requirements.txt
PS C:\Users\ABHINEET\Desktop\Tutterfly\apps\backend> python -m uvicorn app.main:app --reload --port 8000
```

`requirements.txt` includes `uvicorn`, so no separate install is needed for it.

**Frontend** — from the repo root:

```powershell
PS C:\Users\ABHINEET\Desktop\Tutterfly> npm install
PS C:\Users\ABHINEET\Desktop\Tutterfly> npm run dev
```

App: http://localhost:3000 · API docs: http://localhost:8000/api/docs

Check `apps/backend/.env` before running — confirm which database you are pointed at.