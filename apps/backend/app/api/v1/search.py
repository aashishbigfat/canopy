"""
Global Search API endpoint - Cross-module search
"""
from fastapi import APIRouter, Depends, Query, Request, Response
from typing import Optional, List
from bson import ObjectId
import re

from app.models.user import User
from app.models.lead import Lead
from app.models.account import Account
from app.models.contact import Contact
from app.models.opportunity import Opportunity
from app.api.deps import get_current_user
from app.core.rate_limiter import limiter

router = APIRouter()


@router.get("/")
@limiter.limit("30/minute")
async def global_search(
    request: Request,
    response: Response,
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(5, ge=1, le=20, description="Results per module"),
    current_user: User = Depends(get_current_user)
):
    """
    Search across all modules: leads, accounts, contacts, opportunities
    
    Returns results grouped by module with basic info for each match.
    """
    tenant_id = current_user.tenant_id
    results = {
        "query": q,
        "results": []
    }
    
    # Create case-insensitive regex pattern
    pattern = re.compile(f".*{re.escape(q)}.*", re.IGNORECASE)
    
    # Search Leads
    leads = await Lead.find(
        Lead.tenant_id == tenant_id,
        Lead.deleted_at == None,
        {"$or": [
            {"first_name": {"$regex": pattern}},
            {"last_name": {"$regex": pattern}},
            {"email": {"$regex": pattern}},
            {"company": {"$regex": pattern}},
        ]}
    ).limit(limit).to_list()
    
    if leads:
        results["results"].append({
            "module": "leads",
            "label": "Leads",
            "items": [
                {
                    "id": str(lead.id),
                    "title": f"{lead.first_name or ''} {lead.last_name or ''}".strip() or lead.email or "Unnamed Lead",
                    "subtitle": lead.company,
                    "url": f"/leads/{lead.id}",
                }
                for lead in leads
            ]
        })
    
    # Search Accounts
    accounts = await Account.find(
        Account.tenant_id == tenant_id,
        Account.deleted_at == None,
        {"$or": [
            {"name": {"$regex": pattern}},
            {"email": {"$regex": pattern}},
            {"phone": {"$regex": pattern}},
        ]}
    ).limit(limit).to_list()
    
    if accounts:
        results["results"].append({
            "module": "accounts",
            "label": "Accounts",
            "items": [
                {
                    "id": str(account.id),
                    "title": account.name or account.email or "Unnamed Account",
                    "subtitle": account.industry,
                    "url": f"/accounts/{account.id}",
                }
                for account in accounts
            ]
        })
    
    # Search Contacts
    contacts = await Contact.find(
        Contact.tenant_id == tenant_id,
        Contact.deleted_at == None,
        {"$or": [
            {"first_name": {"$regex": pattern}},
            {"last_name": {"$regex": pattern}},
            {"email": {"$regex": pattern}},
        ]}
    ).limit(limit).to_list()
    
    if contacts:
        results["results"].append({
            "module": "contacts",
            "label": "Contacts",
            "items": [
                {
                    "id": str(contact.id),
                    "title": f"{contact.first_name or ''} {contact.last_name or ''}".strip() or contact.email or "Unnamed Contact",
                    "subtitle": contact.email,
                    "url": f"/contacts/{contact.id}",
                }
                for contact in contacts
            ]
        })
    
    # Search Opportunities
    opportunities = await Opportunity.find(
        Opportunity.tenant_id == tenant_id,
        Opportunity.deleted_at == None,
        {"name": {"$regex": pattern}}
    ).limit(limit).to_list()
    
    if opportunities:
        results["results"].append({
            "module": "opportunities",
            "label": "Opportunities",
            "items": [
                {
                    "id": str(opp.id),
                    "title": opp.name,
                    "subtitle": f"₹{opp.amount:,.0f}" if opp.amount else None,
                    "url": f"/opportunities/{opp.id}",
                }
                for opp in opportunities
            ]
        })
    
    return results
