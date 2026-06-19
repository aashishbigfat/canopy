"""
Main FastAPI application - reload triggered 2
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
import uuid
import json

from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi.responses import JSONResponse as _JSONResponse
import logging as _logging

_logger = _logging.getLogger(__name__)

def _custom_rate_limit_handler(request, exc):
    """
    Custom handler replacing slowapi's default.
    slowapi can pass a redis ConnectionError here (not a RateLimitExceeded),
    which crashes because ConnectionError has no .detail attribute.
    We handle both cases gracefully.
    """
    if isinstance(exc, RateLimitExceeded):
        return _JSONResponse(
            status_code=429,
            content={"error": f"Rate limit exceeded: {exc.detail}"},
        )
    # Redis ConnectionError or any other unexpected exception from the limiter
    _logger.warning("Rate limiter backend error (Redis unreachable?): %s", exc)
    # Fail open: let the request through rather than returning a 500
    return None

from app.core.config import settings
from app.core.logging_config import configure_logging
from app.core.rate_limiter import limiter
from app.core.cache import init_cache, close_cache
from app.db.mongodb import init_db
from app.middleware.activity_context import ActivityContextMiddleware
from app.api.v1 import accounts

# Configure root logger before anything else runs. JSON output in prod
# (parseable by log shippers), human-readable text in dev. Sensitive fields
# (password, token, authorization) are redacted by a filter.
configure_logging(settings.ENVIRONMENT)


# ── Sentry ──────────────────────────────────────────────────────────────────
# Initialize Sentry early — before app construction — so any startup error is
# captured. DSN is optional in dev (no DSN → SDK is a no-op).
_sentry_dsn = getattr(settings, "SENTRY_DSN", None)
if _sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration

        def _scrub_event(event, hint):
            """Drop tokens / passwords / API keys from breadcrumbs and request data."""
            sensitive_keys = (
                "password", "token", "access_token", "refresh_token",
                "authorization", "api_key", "secret", "smtp_password",
            )

            def _scrub(obj):
                if isinstance(obj, dict):
                    return {
                        k: ("[REDACTED]" if k.lower() in sensitive_keys else _scrub(v))
                        for k, v in obj.items()
                    }
                if isinstance(obj, list):
                    return [_scrub(v) for v in obj]
                return obj

            # Scrub request data
            request = event.get("request", {})
            if isinstance(request.get("headers"), dict):
                request["headers"] = _scrub(request["headers"])
            if isinstance(request.get("cookies"), dict):
                request["cookies"] = _scrub(request["cookies"])
            if isinstance(request.get("data"), dict):
                request["data"] = _scrub(request["data"])
            # Scrub breadcrumbs
            crumbs = event.get("breadcrumbs", {})
            if isinstance(crumbs, dict) and isinstance(crumbs.get("values"), list):
                for crumb in crumbs["values"]:
                    if isinstance(crumb, dict) and isinstance(crumb.get("data"), dict):
                        crumb["data"] = _scrub(crumb["data"])
            return event

        sentry_sdk.init(
            dsn=_sentry_dsn,
            environment=settings.ENVIRONMENT,
            integrations=[FastApiIntegration()],
            traces_sample_rate=float(getattr(settings, "SENTRY_TRACES_SAMPLE_RATE", 0.0)),
            send_default_pii=False,
            before_send=_scrub_event,
        )
    except Exception:
        _logger.exception("Failed to initialize Sentry — continuing without it")

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    await init_cache()
    yield
    # Shutdown (cleanup if needed)
    await close_cache()

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ── Rate Limiting ─────────────────────────────────────────────────────────────
# Attach limiter state to app for SlowAPI middleware discovery
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _custom_rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)

# Activity logging middleware — pure ASGI so cancelled/disconnected requests
# don't trigger BaseHTTPMiddleware's "No response returned." RuntimeError.
app.add_middleware(ActivityContextMiddleware)


# CORS middleware - Added last to be outermost
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    from fastapi.encoders import jsonable_encoder

    encoded_errors = jsonable_encoder(exc.errors())

    is_production = settings.ENVIRONMENT == "production"
    if not is_production:
        _logger.warning(
            "422 Validation Error at %s: %s", request.url.path, encoded_errors
        )

    content: dict = {"detail": encoded_errors}
    if not is_production:
        content["body"] = str(exc.body)

    return JSONResponse(status_code=422, content=content)

# Include routers
from app.api.v1 import accounts, contacts, auth, leads, opportunities, tasks, events, notes, emails, files, suppliers, itineraries, packages, departures, users, roles, destinations, departments, products, quotes, invoices, countries, activity_logs, tags, notifications, comments, reminders, templates, reports, dashboards, territories, incentives, billing, webhooks, search, opportunity_financial, hierarchies
# BD Panel — Phase 4+ (visits, expenses, tracking, automation rules)
from app.api.v1 import bd_visits, expenses as bd_expenses, tracking as bd_tracking, automation_rules
from app.api.v1 import settings as settings_routes
from app.api.v1 import contacts_extra
from app.api.v1 import accounts_extra
# Phase 1 — Field registry + picklists
from app.api.v1 import custom_fields, standard_fields, picklists
# Phase 2 — Admin settings hub
from app.api.v1 import admin_settings
# Phase 4 — Entity views/columns/filters/pinned
from app.api.v1 import entity_views
# Phase 6 — Opportunity workflow
from app.api.v1 import opportunity_workflow
# Phase 7 — Messaging (Gmail/Email/WhatsApp/Chatbot)
from app.api.v1 import messaging
# Phase 8 — Reports extras (standard reports, folders, preview, clone)
from app.api.v1 import reports_extra
# Phase 14 — FCM tokens + reminder cron
from app.api.v1 import fcm
# Phase 15 — Subscription / Razorpay parity
from app.api.v1 import subscription
# Phase 11 — Dashboard extras
from app.api.v1 import dashboards_extra
# Phase 10 — User mgmt extras
from app.api.v1 import users_extra
# Phase 12 — Search modules + supplier templates
from app.api.v1 import search_extras
# Phase 13 — Imports / Exports
from app.api.v1 import imports_exports
# Phase 9 — Files extras (folders, shares, versions, public links)
from app.api.v1 import files_extra
# Phase 5 — Itinerary engine extension
from app.api.v1 import itineraries_extra
# Phase 16 — Mobile API
from app.api.v1 import mobile
# Phase 17 — Misc / utility
from app.api.v1 import misc
# Industry verticals — healthcare APIs (gated by per-tenant module flags)
from app.api.v1 import patients, providers, appointments, care_plans, referrals
# Industry verticals — education APIs
from app.api.v1 import programs, enrollments
# Industry verticals — manufacturing APIs
from app.api.v1 import boms, production_orders, inventory

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication (Alias)"]) # Fallback for misconfigured clients
app.include_router(accounts_extra.router, prefix="/api/v1/accounts", tags=["Accounts"])
app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["Accounts"])
app.include_router(contacts_extra.router, prefix="/api/v1/contacts", tags=["Contacts"])
app.include_router(contacts.router, prefix="/api/v1/contacts", tags=["Contacts"])
app.include_router(leads.router, prefix="/api/v1/leads", tags=["Leads"])
app.include_router(opportunity_financial.router, prefix="/api/v1/opportunities", tags=["Opportunity Financial"])
app.include_router(opportunities.router, prefix="/api/v1/opportunities", tags=["Opportunities"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["Tasks"])
app.include_router(events.router, prefix="/api/v1/events", tags=["Events"])
app.include_router(notes.router, prefix="/api/v1/notes", tags=["Notes"])
app.include_router(emails.router, prefix="/api/v1/emails", tags=["Emails"])
# Phase 9 — Files extras (folders, shares, versions, public links)
app.include_router(files_extra.router, prefix="/api/v1/files", tags=["Files Extras"])
app.include_router(files.router, prefix="/api/v1/files", tags=["Files"])
app.include_router(suppliers.router, prefix="/api/v1/suppliers", tags=["Suppliers"])
# Phase 5 — Itinerary engine extension (categories, schedule, hotels, flights, PDF, proforma)
app.include_router(itineraries_extra.router, prefix="/api/v1/itineraries", tags=["Itineraries Extras"])
app.include_router(itineraries.router, prefix="/api/v1/itineraries", tags=["Itineraries"])
app.include_router(packages.router, prefix="/api/v1/packages", tags=["Packages"])
app.include_router(departures.router, prefix="/api/v1/departures", tags=["Departures"])
# Phase 10 — User mgmt extras (profile, targets, directory, login logs)
app.include_router(users_extra.router, prefix="/api/v1/users", tags=["Users Extras"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(roles.router, prefix="/api/v1/roles", tags=["Roles"])
app.include_router(hierarchies.router, prefix="/api/v1/hierarchies", tags=["Hierarchies"])
app.include_router(destinations.router, prefix="/api/v1/destinations", tags=["Destinations"])
app.include_router(departments.router, prefix="/api/v1/departments", tags=["Departments"])
app.include_router(products.router, prefix="/api/v1/products", tags=["Products"])
app.include_router(quotes.router, prefix="/api/v1/quotes", tags=["Quotes"])
app.include_router(invoices.router, prefix="/api/v1/invoices", tags=["Invoices"])
app.include_router(countries.router, prefix="/api/v1/countries", tags=["Countries"])
app.include_router(activity_logs.router, prefix="/api/v1/timeline", tags=["Timeline Events"])
app.include_router(settings_routes.router, prefix="/api/v1/settings", tags=["Settings"])
app.include_router(tags.router, prefix="/api/v1/tags", tags=["Tags"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(comments.router, prefix="/api/v1/comments", tags=["Comments"])
app.include_router(reminders.router, prefix="/api/v1/reminders", tags=["Reminders"])
app.include_router(templates.router, prefix="/api/v1/templates", tags=["Templates"])
# Phase 8 — Reports extras (standard, folders, preview, clone, sample)
app.include_router(reports_extra.router, prefix="/api/v1/reports", tags=["Reports Extras"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
# Phase 11 — Dashboard extras (BD/legacy aggregates + quick links)
app.include_router(dashboards_extra.router, prefix="/api/v1/dashboards", tags=["Dashboards Extras"])
app.include_router(dashboards.router, prefix="/api/v1/dashboards", tags=["Dashboards"])
app.include_router(territories.router, prefix="/api/v1/territories", tags=["Territories"])
# BD Panel — visits, expenses, live tracking
app.include_router(bd_visits.router, prefix="/api/v1/bd-visits", tags=["BD Visits"])
app.include_router(bd_expenses.router, prefix="/api/v1/expenses", tags=["BD Expenses"])
app.include_router(bd_tracking.router, prefix="/api/v1/tracking", tags=["BD Tracking"])
app.include_router(automation_rules.router, prefix="/api/v1/automation-rules", tags=["Automation Rules"])
app.include_router(incentives.router, prefix="/api/v1/incentives", tags=["Incentives"])
app.include_router(billing.router, prefix="/api/v1/billing", tags=["Billing"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])
app.include_router(search.router, prefix="/api/v1/search", tags=["Search"])
# Phase 1 — Field registry + picklists
app.include_router(custom_fields.router, prefix="/api/v1/custom_fields", tags=["Custom Fields"])
app.include_router(standard_fields.router, prefix="/api/v1/standard_fields", tags=["Standard Fields"])
app.include_router(picklists.router, prefix="/api/v1/picklists", tags=["Picklists"])
# Phase 2 — Admin settings hub
app.include_router(admin_settings.router, prefix="/api/v1/admin", tags=["Admin Settings"])
# Phase 4 — Entity views/columns/filters/pinned
app.include_router(entity_views.router, prefix="/api/v1/entity_views", tags=["Entity Views"])
# Phase 6 — Opportunity workflow (vouchers, departures, ledger, claims, handover, external capture)
app.include_router(opportunity_workflow.router, prefix="/api/v1/opportunities", tags=["Opportunity Workflow"])
# Phase 7 — Messaging (Gmail / WhatsApp / Chatbot)
app.include_router(messaging.router, prefix="/api/v1/messaging", tags=["Messaging"])
# Phase 14 — FCM tokens + reminder cron
app.include_router(fcm.router, prefix="/api/v1/fcm", tags=["FCM"])
# Phase 15 — Subscription / Razorpay parity
app.include_router(subscription.router, prefix="/api/v1/subscription", tags=["Subscription"])
# Phase 12 — Search modules + supplier templates
app.include_router(search_extras.router, prefix="/api/v1/search_extras", tags=["Search Extras"])
# Phase 13 — Imports / Exports per entity
app.include_router(imports_exports.router, prefix="/api/v1/imports", tags=["Imports/Exports"])
# Phase 16 — Mobile API (thin shim for mobile clients)
app.include_router(mobile.router, prefix="/api/v1/mobile", tags=["Mobile"])
# Phase 17 — Misc / utility (s3 url, lat-long, country, FB stubs, public verify)
app.include_router(misc.router, prefix="/api/v1/misc", tags=["Misc"])

# Industry verticals — Healthcare CRUD routers, gated by the corresponding
# `modules.{patients,providers,appointments,care_plans,referrals}` flag on the
# tenant. A travel tenant therefore gets 403 from these endpoints.
app.include_router(patients.router, prefix="/api/v1/patients", tags=["Healthcare - Patients"])
app.include_router(providers.router, prefix="/api/v1/providers", tags=["Healthcare - Providers"])
app.include_router(appointments.router, prefix="/api/v1/appointments", tags=["Healthcare - Appointments"])
app.include_router(care_plans.router, prefix="/api/v1/care-plans", tags=["Healthcare - Care Plans"])
app.include_router(referrals.router, prefix="/api/v1/referrals", tags=["Healthcare - Referrals"])

# Industry verticals — Education
app.include_router(programs.router, prefix="/api/v1/programs", tags=["Education - Programs"])
app.include_router(enrollments.router, prefix="/api/v1/enrollments", tags=["Education - Enrollments"])

# Industry verticals — Manufacturing
app.include_router(boms.router, prefix="/api/v1/boms", tags=["Manufacturing - BOM"])
app.include_router(production_orders.router, prefix="/api/v1/production-orders", tags=["Manufacturing - Production Orders"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Manufacturing - Inventory"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/health/redis")
async def redis_health_check():
    """Check Redis connectivity and cache backend status"""
    from app.core.cache import get_cache_status
    try:
        status = await get_cache_status()
        return {"status": "healthy", **status}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )


@app.get("/debug/cors")
async def debug_cors():
    """Debug endpoint to check CORS configuration. Dev only — disabled in production."""
    if settings.ENVIRONMENT == "production":
        return JSONResponse(status_code=404, content={"detail": "Not found"})
    return {
        "cors_origins": settings.cors_origins_list,
        "environment": settings.ENVIRONMENT
    }

@app.get("/favicon.ico")
async def favicon():
    """Return empty response for favicon requests"""
    return {"message": "No favicon"}
