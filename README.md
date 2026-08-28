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

```bash
npm run install:all   # frontend deps + backend pip install
npm run dev           # frontend :3000 + backend :8000
```

API docs: http://localhost:8000/api/docs

Check `apps/backend/.env` before running — confirm which database you are pointed at.
