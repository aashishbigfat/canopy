"""
Celery background tasks for Account module
"""
from celery import Celery
from bson import ObjectId
from datetime import datetime

import os

# Initialize Celery
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery(
    'tutterfly_tasks',
    broker=redis_url,
    backend=redis_url
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

@celery_app.task(name='tasks.track_user_view')
def track_user_view(user_id: str, account_id: str, tenant_id: str):
    """Track that a user viewed an account.

    SECURITY: lookup is scoped to tenant_id so a forged task payload cannot
    increment/create a view row on another tenant's record.
    """
    from app.models.user_account_view import UserAccountView
    import asyncio

    async def _track():
        user_obj_id = ObjectId(user_id)
        account_obj_id = ObjectId(account_id)
        tenant_obj_id = ObjectId(tenant_id)

        view = await UserAccountView.find_one(
            {
                "user_id": user_obj_id,
                "account_id": account_obj_id,
                "tenant_id": tenant_obj_id,
            }
        )

        if view:
            view.count += 1
            view.updated_at = datetime.utcnow()
            await view.save()
        else:
            view = UserAccountView(
                user_id=user_obj_id,
                account_id=account_obj_id,
                tenant_id=tenant_obj_id,
                count=1
            )
            await view.insert()

    asyncio.run(_track())
    return f"Tracked view for user {user_id} on account {account_id}"


@celery_app.task(name='tasks.add_record_id')
def add_record_id(module: str, record_id: str):
    """Add record ID to tracking system"""
    # This could be used for analytics, auditing, etc.
    return f"Added record {record_id} for module {module}"


@celery_app.task(name='tasks.send_owner_change_email')
def send_owner_change_email(
    module_name: str,
    new_owner_id: str,
    module_display_name: str,
    module_url: str,
    tenant_id: str,
    module_id: str
):
    """Send email notification when owner changes.

    SECURITY: target user lookup is scoped to tenant_id — a forged task
    payload cannot leak another tenant's user info or trigger an email to
    an unrelated user.
    """
    from app.services.email_service import EmailService
    from app.models.user import User
    import asyncio

    async def _send_email():
        # Tenant-scoped lookup of the new owner
        user = await User.find_one(
            {
                "_id": ObjectId(new_owner_id),
                "tenant_id": ObjectId(tenant_id),
                "deleted_at": None,
                "is_active": True,
            }
        )

        if user and user.email:
            email_service = EmailService()
            
            subject = f"You are now the owner of {module_name}: {module_display_name}"
            body = f"""
            Hello {user.name},
            
            You have been assigned as the new owner of the following {module_name}:
            
            Name: {module_display_name}
            URL: {module_url}/{module_id}
            
            Please review and take necessary actions.
            
            Best regards,
            TutterflyC CRM
            """
            
            await email_service.send_email(
                to_email=user.email,
                subject=subject,
                body=body
            )
    
    asyncio.run(_send_email())
    return f"Sent owner change email to {new_owner_id}"
