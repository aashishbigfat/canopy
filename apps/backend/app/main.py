"""
Main FastAPI application
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
import uuid
import json

from app.core.config import settings
from app.db.mongodb import init_db
from app.middleware.activity_context import activity_context_middleware
from app.api.v1 import accounts

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown (cleanup if needed)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Activity logging middleware
@app.middleware("http")
async def add_activity_context(request: Request, call_next):
    return await activity_context_middleware(request, call_next)


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
    import json
    print(f"DEBUG: 422 Validation Error at {request.url.path}")
    print(f"DEBUG: Error details: {json.dumps(exc.errors(), indent=2)}")
    print(f"DEBUG: Request body: {exc.body}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(exc.body)},
    )

# Include routers
from app.api.v1 import accounts, contacts, auth, leads, opportunities, tasks, events, notes, emails, files, suppliers, itineraries, packages, users, roles, destinations, departments, products, quotes, invoices, countries, activity_logs, tags, notifications, comments, reminders, templates, reports, dashboards, territories, incentives, billing, webhooks, search
from app.api.v1 import settings as settings_routes
from app.api.v1 import contacts_extra

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication (Alias)"]) # Fallback for misconfigured clients
app.include_router(accounts.router, prefix="/api/v1/accounts", tags=["Accounts"])
app.include_router(contacts_extra.router, prefix="/api/v1/contacts", tags=["Contacts"])
app.include_router(contacts.router, prefix="/api/v1/contacts", tags=["Contacts"])
app.include_router(leads.router, prefix="/api/v1/leads", tags=["Leads"])
app.include_router(opportunities.router, prefix="/api/v1/opportunities", tags=["Opportunities"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["Tasks"])
app.include_router(events.router, prefix="/api/v1/events", tags=["Events"])
app.include_router(notes.router, prefix="/api/v1/notes", tags=["Notes"])
app.include_router(emails.router, prefix="/api/v1/emails", tags=["Emails"])
app.include_router(files.router, prefix="/api/v1/files", tags=["Files"])
app.include_router(suppliers.router, prefix="/api/v1/suppliers", tags=["Suppliers"])
app.include_router(itineraries.router, prefix="/api/v1/itineraries", tags=["Itineraries"])
app.include_router(packages.router, prefix="/api/v1/packages", tags=["Packages"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(roles.router, prefix="/api/v1/roles", tags=["Roles"])
app.include_router(destinations.router, prefix="/api/v1/destinations", tags=["Destinations"])
app.include_router(departments.router, prefix="/api/v1/departments", tags=["Departments"])
app.include_router(products.router, prefix="/api/v1/products", tags=["Products"])
app.include_router(quotes.router, prefix="/api/v1/quotes", tags=["Quotes"])
app.include_router(invoices.router, prefix="/api/v1/invoices", tags=["Invoices"])
app.include_router(countries.router, prefix="/api/v1/countries", tags=["Countries"])
app.include_router(activity_logs.router, prefix="/api/v1/activity-logs", tags=["Activity Logs"])
app.include_router(settings_routes.router, prefix="/api/v1/settings", tags=["Settings"])
app.include_router(tags.router, prefix="/api/v1/tags", tags=["Tags"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(comments.router, prefix="/api/v1/comments", tags=["Comments"])
app.include_router(reminders.router, prefix="/api/v1/reminders", tags=["Reminders"])
app.include_router(templates.router, prefix="/api/v1/templates", tags=["Templates"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(dashboards.router, prefix="/api/v1/dashboards", tags=["Dashboards"])
app.include_router(territories.router, prefix="/api/v1/territories", tags=["Territories"])
app.include_router(incentives.router, prefix="/api/v1/incentives", tags=["Incentives"])
app.include_router(billing.router, prefix="/api/v1/billing", tags=["Billing"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])
app.include_router(search.router, prefix="/api/v1/search", tags=["Search"])

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

@app.get("/debug/cors")
async def debug_cors():
    """Debug endpoint to check CORS configuration"""
    return {
        "cors_origins": settings.cors_origins_list,
        "environment": settings.ENVIRONMENT
    }

@app.get("/favicon.ico")
async def favicon():
    """Return empty response for favicon requests"""
    return {"message": "No favicon"}
