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
from app.models.supplier_contact import SupplierContact
from app.models.itinerary import Itinerary, ItineraryDay
from app.models.package import Package, PackagePricing
from app.models.role import Role
from app.models.department import Department
from app.models.destination import Destination
from app.models.product import Product
from app.models.quote import Quote, QuoteItem
from app.models.invoice import Invoice, InvoiceItem, Payment
from app.models.country import Country, State, City
from app.models.activity_log import ActivityLog, LoginLog
from app.models.consolidated_settings import (
    TenantSettings, UserSettings, CompanySettings, LeaderboardConfig, 
    OpportunityWorkflowSettings, EmailFooter, AutoAssignmentRule,
    UserAssignmentRule, CountryUserAssignment, DepartmentMapping, AgentConnection
)
from app.models.tag import Tag
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
from app.models.consolidated_picklists import (
    BasePicklist, SalesStage, OpportunityType, Experience, OpportunityTag,
    LeadStatus, Source, SourceMedium,
    AccountType, Industry, Rating, AccountSource, SupplierServicePicklist
)
from app.models.user_account_view import UserAccountView
from app.models.user_contact_view import UserContactView
from app.models.account_views import AccountView, AccountColumn
# AccountContact imported via consolidated_pivots
from app.models.contact_views import ContactView, ContactColumn
# Consolidated picklists imported above
# AccountCustomField imported via consolidated_fields
from app.models.module_attachment import ModuleAttachment
from app.models.opportunity_financial import OpportunityCosting, PaymentScheduleItem, OpportunityTransaction
# Phase 1 — Field registry (consolidated - single collection)
from app.models.consolidated_fields import (
    AdditionalFieldAccount,
    AdditionalFieldContact,
    AdditionalFieldLead,
    AdditionalFieldOpportunity,
    AdditionalFieldSupplier,
    AdditionalFieldPersonalAccount,
    AdditionalFieldTask,
    AccountCustomField,
    ContactCustomField,
    LeadCustomField,
    OpportunityCustomField,
    SupplierCustomField,
    PersonalAccountCustomField,
    TaskCustomField,
    StandardField,
)
# Phase 4 — Polymorphic views/columns/filters/pinned
from app.models.entity_views import (
    EntityView, EntityColumn, EntityFilter, EntityPinView
)
# Phase 6 — Opportunity workflow
from app.models.opportunity_workflow import (
    Voucher, Departure, LedgerAccount, OpportunityClaim,
    HandoverRequest, ExternalLead, OpportunityPaymentSchedule,
)
# Phase 7 — Messaging (Gmail / Email / WhatsApp / Chatbot)
from app.models.messaging import (
    GmailIntegration, EmailMessage, WhatsAppTemplate,
    WhatsAppMessage, ChatbotWebhookEvent,
)
# Phase 8 — Report folders & shares
from app.models.report_folders import ReportFolder
# Phase 14 — FCM tokens
from app.models.fcm import FCMToken
# Pivot relations (using original un-consolidated models)
# Phase 11 — Dashboard quick links
from app.models.quick_link import QuickLink
# Phase 12 — Search modules + supplier templates
from app.models.search_extras import (
    SearchModuleConfig, SearchNote, SupplierEmailTemplate,
)
# Phase 9 — File folders / shares / versions / public links
from app.models.file_extras import (
    FileFolder, FileVersion, FilePublicLink,
)
# Phase 5 — Itinerary engine extension
from app.models.itinerary_extras import (
    ItineraryCategory, ItinerarySubCategory,
    ItineraryScheduleItem, ItineraryHotel, ItineraryFlight,
    ItineraryInclusion, UserItineraryInclusion,
    ItineraryHeaderFooter, ProformaInvoice, TourItinerary,
    ItineraryPDFJob,
)
# Phase 17 — Email tokens
from app.models.email_token import EmailToken


from app.models.destination import DestinationOpportunity, DestinationLead
from app.models.account_contact import AccountContact
from app.models.itinerary import ItineraryOpportunity
from app.models.package import PackageOpportunity
from app.models.tag import EntityTag
from app.models.account_views import AccountPinView
from app.models.opportunity_workflow import OpportunityTeamMember
from app.models.report_folders import ReportFolderShare
from app.models.file_extras import FileShare
from app.models.role import RoleHierarchy

# Missing Industry Models
from app.models.supplier import OpportunitySupplier
from app.models.education.admission import Admission
from app.models.education.enrollment import Course, Enrollment, Faculty, AcademicTerm, Scholarship
from app.models.education.program import Program
from app.models.healthcare.appointment import Appointment
from app.models.healthcare.care_plan import CarePlan
from app.models.healthcare.insurance_verification import InsuranceVerification
from app.models.healthcare.patient import Patient
from app.models.healthcare.provider import Provider
from app.models.healthcare.referral import Referral
from app.models.manufacturing.bom import BOMItem, BillOfMaterials
from app.models.manufacturing.inventory import Warehouse, InventoryItem, InventoryTransaction
from app.models.manufacturing.production_order import ProductionOrder, WorkOrder
from app.models.manufacturing.product_catalog import ManufacturingProduct
from app.models.manufacturing.quality_inspection import QualityInspection

from app.models.lead_custom_fields import UserLeadView
from app.models.opportunity_custom_fields import UserOpportunityView
from app.models.opportunity_picklists import OpportunityHistory, OpportunityLock

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
            SupplierContact,
            Itinerary,
            ItineraryDay,
            Package,
            PackagePricing,
            Destination,
            Product,
            Quote,
            QuoteItem,
            Invoice,
            InvoiceItem,
            Payment,
            # Organization
            Role,
            Department,
            # Geographic
            Country,
            State,
            City,
            # Activity Logs
            ActivityLog,
            LoginLog,
            # Settings (consolidated - single collection)
            TenantSettings,
            UserSettings,
            CompanySettings,
            LeaderboardConfig,
            OpportunityWorkflowSettings,
            EmailFooter,
            AutoAssignmentRule,
            UserAssignmentRule,
            CountryUserAssignment,
            DepartmentMapping,
            AgentConnection,
            # Tags
            Tag,
            # Relations (consolidated - single collection)


            # Original Pivot Relations
            DestinationOpportunity,
            DestinationLead,
            ItineraryOpportunity,
            PackageOpportunity,
            AccountContact,
            EntityTag,
            OpportunityTeamMember,
            AccountPinView,
            ReportFolderShare,
            FileShare,
            RoleHierarchy,
            
            # Missing Industry Models
            OpportunitySupplier,
            Admission, Course, Enrollment, Faculty, AcademicTerm, Scholarship, Program,
            Appointment, CarePlan, InsuranceVerification, Patient, Provider, Referral,
            BOMItem, BillOfMaterials, Warehouse, InventoryItem, InventoryTransaction, ProductionOrder, WorkOrder, ManufacturingProduct, QualityInspection,
            
            # Missing Custom Fields and Views
            # Phase 1 — Field registry (consolidated)
            AdditionalFieldAccount,
            AdditionalFieldContact,
            AdditionalFieldLead,
            AdditionalFieldOpportunity,
            AdditionalFieldSupplier,
            AdditionalFieldPersonalAccount,
            AdditionalFieldTask,
            AccountCustomField,
            ContactCustomField,
            LeadCustomField,
            OpportunityCustomField,
            SupplierCustomField,
            PersonalAccountCustomField,
            TaskCustomField,
            StandardField,
            UserLeadView,
            UserOpportunityView,
            OpportunityHistory, OpportunityLock,

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
            # Consolidated picklists (single collection)
            BasePicklist,
            SalesStage,
            OpportunityType,
            Experience,
            OpportunityTag,
            LeadStatus,
            Source,
            SourceMedium,
            Industry,
            Rating,
            AccountType,
            AccountSource,
            SupplierServicePicklist,
            # Entity Views (required for frontend page loads)
            EntityView,
            EntityColumn,
            EntityFilter,
            EntityPinView,
            # Missing models
            UserAccountView,
            UserContactView,
            AccountView,
            AccountColumn,
            ContactView,
            ContactColumn,
            ModuleAttachment,
            # Opportunity Financial
            OpportunityCosting,
            PaymentScheduleItem,
            OpportunityTransaction,
            # NOTE: Sprint A-G new doc registrations DISABLED to fit Atlas
            # free-tier 500-namespace cap. Beanie creates collections lazily
            # on first write — these models still work, they just don't get
            # eager indexes/collections at boot. Re-enable on cluster upgrade.
            # See: PARITY_SCORE.md and COMPLETION_PLAN.md.
        ],
        recreate_views=False,
        allow_index_dropping=True,
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

