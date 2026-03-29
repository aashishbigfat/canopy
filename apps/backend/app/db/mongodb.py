from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
import certifi
import logging

logger = logging.getLogger(__name__)

# Global database client singleton
mongodb_client = None
from app.models.user import User
from app.models.tenant import Tenant
from app.models.account import Account
from app.models.contact import Contact
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.task import Task
from app.models.event import Event
from app.models.note import Note
from app.models.email import Email
from app.models.file import File
from app.models.supplier import Supplier
from app.models.itinerary import Itinerary, ItineraryDay, ItineraryOpportunity
from app.models.package import Package, PackagePricing, PackageOpportunity
from app.models.role import Role, RoleHierarchy
from app.models.destination import Destination, DestinationOpportunity, DestinationLead
from app.models.department import Department
from app.models.product import Product
from app.models.quote import Quote, QuoteItem
from app.models.invoice import Invoice, InvoiceItem, Payment
from app.models.country import Country, State, City
from app.models.activity_log import ActivityLog, LoginLog
from app.models.settings import TenantSettings, UserSettings
from app.models.tag import Tag, EntityTag
from app.models.notification import Notification
from app.models.comment import Comment
from app.models.reminder import Reminder
from app.models.template import Template
from app.models.report import Report, ReportSchedule, ReportExecution
from app.models.dashboard import Dashboard, DashboardWidget, DashboardUserPreference
from app.models.territory import Region, Territory
from app.models.incentive import Incentive, IncentiveTarget, IncentiveAchievement
from app.models.billing import SubscriptionPlan, TenantSubscription, BillingInvoice
from app.models.webhook import WebhookEndpoint, WebhookEvent, WebhookDelivery
from app.models.opportunity_picklists import SalesStage, OpportunityType, Experience, OpportunityTag, OpportunityHistory, OpportunityLock
from app.models.lead_picklists import LeadStatus, Source, SourceMedium

# Missing models causing 500 errors
from app.models.user_account_view import UserAccountView
from app.models.user_contact_view import UserContactView, ContactCustomField
from app.models.account_views import AccountView, AccountColumn, AccountPinView
from app.models.account_contact import AccountContact
from app.models.contact_views import ContactView, ContactColumn, AdditionalFieldContact
from app.models.picklists import Industry, Rating, AccountType, AccountSource, SupplierService as SupplierServicePicklist
from app.models.custom_fields import AccountCustomField
from app.models.module_attachment import ModuleAttachment
from app.models.opportunity_financial import OpportunityCosting, PaymentScheduleItem

async def init_db():
    """Initialize database connection"""
    global mongodb_client
    
    if mongodb_client is None:
        mongodb_client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            ssl=True,
            tls=True,
            tlsCAFile=certifi.where(),
            tlsAllowInvalidCertificates=False,
            maxPoolSize=50,
            minPoolSize=5,
            maxIdleTimeMS=60000,
            connectTimeoutMS=10000,
            socketTimeoutMS=45000,
            serverSelectionTimeoutMS=5000
        )
    
    try:
        await mongodb_client.admin.command('ismaster')
        logger.info(f"✅ Connected to MongoDB Atlas: {settings.MONGODB_DB_NAME}")
        print("mongodb is connected")
    except Exception as e:
        logger.error(f"❌ Initial connection test failed: {e}")
    
    await init_beanie(
        database=mongodb_client[settings.MONGODB_DB_NAME],
        document_models=[
            # Core
            User,
            Tenant,
            Account,
            Contact,
            # Sales
            Lead,
            Opportunity,
            # Activities
            Task,
            Event,
            Note,
            Email,
            File,
            # Travel CRM
            Supplier,
            Itinerary,
            ItineraryDay,
            ItineraryOpportunity,
            Package,
            PackagePricing,
            PackageOpportunity,
            Destination,
            DestinationOpportunity,
            DestinationLead,
            Product,
            Quote,
            QuoteItem,
            Invoice,
            InvoiceItem,
            Payment,
            # Organization
            Role,
            RoleHierarchy,
            Department,
            # Geographic
            Country,
            State,
            City,
            # Activity Logs
            ActivityLog,
            LoginLog,
            # Settings
            TenantSettings,
            UserSettings,
            # Tags
            Tag,
            EntityTag,
            # Notifications
            Notification,
            # Comments
            Comment,
            # Reminders
            Reminder,
            # Templates
            Template,
            # Reports
            Report,
            ReportSchedule,
            ReportExecution,
            # Dashboards
            Dashboard,
            DashboardWidget,
            DashboardUserPreference,
            # Territories
            Region,
            Territory,
            # Incentives
            Incentive,
            IncentiveTarget,
            IncentiveAchievement,
            # Billing
            SubscriptionPlan,
            TenantSubscription,
            BillingInvoice,
            # Webhooks
            WebhookEndpoint,
            WebhookEvent,
            WebhookDelivery,
            # Sales Pipeline
            SalesStage,
            # Opportunity picklists
            OpportunityType,
            Experience,
            OpportunityTag,
            OpportunityHistory,
            OpportunityLock,
            # Lead picklists
            LeadStatus,
            Source,
            SourceMedium,
            # Missing models
            UserAccountView,
            UserContactView,
            ContactCustomField,
            AccountView,
            AccountColumn,
            AccountPinView,
            AccountContact,
            ContactView,
            ContactColumn,
            AdditionalFieldContact,
            Industry,
            Rating,
            AccountType,
            AccountSource,
            SupplierServicePicklist,
            AccountCustomField,
            ModuleAttachment,
            # Opportunity Financial
            OpportunityCosting,
            PaymentScheduleItem,
        ],
        recreate_views=False,
        allow_index_dropping=False,
    )
    
    logger.info(f"✅ Database ODM mapped and ready: {settings.MONGODB_DB_NAME}")


async def get_database():
    """Get database instance via singleton"""
    global mongodb_client
    if mongodb_client is None:
        logger.warning("Database client requested before init_db, initializing now...")
        mongodb_client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            ssl=True,
            tls=True,
            tlsCAFile=certifi.where(),
            tlsAllowInvalidCertificates=False,
            maxPoolSize=50,
            minPoolSize=5,
            maxIdleTimeMS=60000,
            connectTimeoutMS=10000,
            socketTimeoutMS=45000,
            serverSelectionTimeoutMS=5000
        )
    return mongodb_client[settings.MONGODB_DB_NAME]

