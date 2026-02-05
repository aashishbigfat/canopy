# Tutterfly CRM – Backend Architecture

This document defines the backend architecture for the Tutterfly CRM API consumed by the Next.js frontend. The frontend expects **base URL**: `http://localhost:8000/api/v1`.

---

## 1. Technology Stack

| Layer        | Technology   | Notes                          |
|-------------|---------------|---------------------------------|
| Framework   | **FastAPI**   | Async, OpenAPI, Pydantic        |
| Language    | **Python 3.11+** | —                            |
| Auth        | **JWT**       | Bearer tokens, login returns `access_token` + `user` |
| Database    | **MongoDB**   | (or PostgreSQL; align with existing backend) |
| API docs    | OpenAPI       | `/api/docs`, `/api/redoc`       |
| CORS        | Allowed origin | `http://localhost:3000` (frontend) |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Next.js)                               │
│  • Base URL: NEXT_PUBLIC_API_URL = http://localhost:8000/api/v1           │
│  • Auth: Bearer <access_token> on all protected requests                  │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI APPLICATION                              │
├─────────────────────────────────────────────────────────────────────────┤
│  API Layer (routers)     →  /api/v1/auth, /accounts, /leads, ...          │
│  Service Layer           →  Business logic, validation                   │
│  Repository / DB Layer    →  Data access (MongoDB/ORM)                     │
│  Models / Schemas        →  Pydantic request/response, DB models         │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  MongoDB (or existing DB)  │  Optional: Redis (cache/sessions)            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Recommended Folder Structure

Use this layout whether creating a new backend (`tutterfly-python`) or refactoring an existing one:

```
tutterfly-python/                    # or your backend repo root
├── app/
│   ├── main.py                      # FastAPI app, CORS, router includes
│   ├── config.py                    # Settings (env, DB URL, JWT secret)
│   ├── dependencies.py              # get_current_user, DB session, etc.
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py            # Include all v1 routers, prefix /api/v1
│   │       ├── auth.py              # POST /auth/login, /auth/register
│   │       ├── accounts.py           # CRUD + change-owner, form-data
│   │       ├── contacts.py          # CRUD + link-account, unlink-account
│   │       ├── leads.py             # CRUD + convert, statuses, sources
│   │       ├── opportunities.py     # CRUD + lock, unlock, my-pipeline, sales-stages
│   │       ├── tasks.py             # CRUD + complete
│   │       ├── events.py            # CRUD + mark-held
│   │       ├── files.py             # CRUD + download, share
│   │       ├── dashboards.py         # Stats, charts, KPIs
│   │       ├── reports.py            # CRUD reports
│   │       ├── roles.py             # Admin roles CRUD
│   │       └── users.py              # Admin users CRUD
│   │
│   ├── core/
│   │   ├── security.py              # JWT create/verify, password hash
│   │   └── exceptions.py            # HTTP exception handlers
│   │
│   ├── models/                       # DB models (SQLAlchemy/MongoDB ODM)
│   │   ├── user.py
│   │   ├── account.py
│   │   ├── contact.py
│   │   ├── lead.py
│   │   ├── opportunity.py
│   │   ├── task.py
│   │   └── ...
│   │
│   ├── schemas/                      # Pydantic request/response
│   │   ├── auth.py                  # LoginRequest, TokenResponse, UserInToken
│   │   ├── account.py
│   │   ├── contact.py
│   │   ├── lead.py
│   │   └── ...
│   │
│   ├── services/                     # Business logic
│   │   ├── auth_service.py
│   │   ├── account_service.py
│   │   ├── contact_service.py
│   │   ├── lead_service.py
│   │   └── ...
│   │
│   └── db/                           # Database access
│       ├── session.py               # DB connection / session factory
│       └── repositories/             # Optional: per-entity repos
│
├── tests/
├── requirements.txt
├── .env.example
└── README.md
```

---

## 4. API Versioning & Base Path

- **Prefix for all CRM APIs**: `/api/v1`
- **Full base URL**: `http://localhost:8000/api/v1`
- Mount all v1 routes in `main.py`:

```python
from app.api.v1.router import api_router

app.include_router(api_router, prefix="/api/v1")
```

---

## 5. Authentication Architecture

### 5.1 Login (required by frontend)

- **Endpoint**: `POST /api/v1/auth/login`
- **Request body**: `{ "email": str, "password": str }`
- **Response** (must match NextAuth `authorize()` expectations):

```json
{
  "access_token": "<JWT>",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "<string>",
    "name": "<string>",
    "email": "<string>",
    "role_ids": ["<role_id>"],
    "tenant_id": "<string>"
  }
}
```

- **Frontend usage**: NextAuth Credentials provider calls this; on success it stores `access_token` and user in the session and sends `Authorization: Bearer <access_token>` on all `apiClient` requests.

### 5.2 Protected routes

- **Dependency**: `get_current_user` that:
  - Reads `Authorization: Bearer <token>`
  - Verifies JWT and loads user (and optionally tenant_id, role_ids)
  - Returns user object or raises 401

### 5.3 Optional: Register

- **Endpoint**: `POST /api/v1/auth/register` (if used later for self-signup).

---

## 6. Module-to-Route Mapping (aligned with frontend)

These paths are relative to base `http://localhost:8000/api/v1`.

| Module         | Base path     | Main operations (frontend expects) |
|----------------|---------------|-------------------------------------|
| **Auth**       | `/auth`       | `POST /login` → `access_token` + `user` |
| **Accounts**  | `/accounts`   | GET list (paginated), GET `/:id`, POST, PUT `/:id`, DELETE `/:id`, GET `/search`, POST `/:id/change-owner`, GET `/form-data` |
| **Contacts**   | `/contacts`   | CRUD, POST `/:id/link-account`, DELETE `/:id/unlink-account`, POST `/:id/change-owner` |
| **Leads**      | `/leads`      | CRUD, GET `/statuses`, GET `/sources`, POST `/:id/convert`, GET `/:id/convert`, POST `/:id/change-owner` |
| **Opportunities** | `/opportunities` | CRUD, POST `/:id/lock`, POST `/:id/unlock`, POST `/:id/change-owner`, GET `/my-pipeline`, GET `/sales-stages` |
| **Tasks**      | `/tasks`      | CRUD, POST `/:id/complete` |
| **Events**     | `/events`     | CRUD, POST `/:id/mark-held` |
| **Files**      | `/files`      | CRUD, GET `/:id/download`, POST `/:id/share` |
| **Dashboards** | `/dashboards` or `/dashboard` | GET stats/charts (exact paths per frontend `dashboardService`) |
| **Reports**    | `/reports`    | CRUD |
| **Admin – Roles** | `/roles`   | CRUD |
| **Admin – Users** | `/users`   | CRUD |

---

## 7. Response Conventions (for frontend compatibility)

- **Paginated list**: e.g. `{ "accounts": [...], "pagination": { "current_page", "total", "per_page", "pages" } }` (see `API_ROUTES_ANALYSIS.md` for exact shapes).
- **Single resource**: Return the entity object (e.g. account, lead) with consistent field names (`snake_case` is fine; frontend can map if needed).
- **Errors**: Use HTTP status codes (401, 403, 404, 422) and a consistent error body (e.g. `{ "detail": "..." }` or `{ "message": "..." }`).

---

## 8. Configuration (environment)

Backend should support at least:

```env
# .env.example
MONGODB_URL=mongodb://localhost:27017/tutterfly
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_SECONDS=3600
CORS_ORIGINS=["http://localhost:3000"]
```

Frontend already uses:

- `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
- NextAuth calls `POST {NEXT_PUBLIC_API_URL}/auth/login`.

---

## 9. Cross-Cutting Concerns

- **CORS**: Allow origin `http://localhost:3000` (and production frontend URL when deployed).
- **Logging**: Request ID, method, path, status, duration.
- **Validation**: Pydantic for all request bodies and query params.
- **Health**: Optional `GET /health` for readiness checks (frontend test uses it).

---

## 10. References in This Repo

- **API contract details**: `API_ROUTES_ANALYSIS.md`
- **Frontend API client**: `src/lib/api/client.ts` (base URL, Bearer token)
- **Auth flow**: `src/lib/auth.ts` (login request/response shape)
- **Per-resource calls**: `src/features/*/services/*.ts` and `src/lib/api/services/*.ts`

Use this architecture to implement or refactor the backend so the existing Next.js app can connect without frontend changes.
