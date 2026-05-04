"""
Consolidated pivot/junction table models - all many-to-many relations stored in single collection
to reduce MongoDB collection count.
Uses 'relation_type' discriminator field.
"""
from beanie import Indexed, Document
from pydantic import Field
from typing import Optional, Literal
from beanie import PydanticObjectId
from datetime import datetime

class BaseRelation(Document):
    """Base relation document - all relations stored in 'relations' collection"""
    tenant_id: Optional[Indexed(PydanticObjectId)] = None
    
    # Source and target IDs (meaning depends on relation_type)
    source_id: Indexed(PydanticObjectId)
    target_id: Optional[Indexed(PydanticObjectId)] = None
    
    # Discriminator field
    relation_type: str
    
    # Optional metadata
    metadata: Optional[dict] = None
    sorting: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "relations"
        indexes = [
            "relation_type",
            "tenant_id",
            "source_id",
            "target_id",
            [("relation_type", 1), ("source_id", 1)],
            [("relation_type", 1), ("target_id", 1)],
            [("relation_type", 1), ("tenant_id", 1), ("source_id", 1)],
        ]


class DestinationOpportunity(BaseRelation):
    """Opportunity-Destination many-to-many"""
    relation_type: Literal["destination_opportunity"] = "destination_opportunity"
    
    class Settings:
        name = "relations"

class DestinationLead(BaseRelation):
    """Lead-Destination many-to-many"""
    relation_type: Literal["destination_lead"] = "destination_lead"
    
    class Settings:
        name = "relations"

class ItineraryOpportunity(BaseRelation):
    """Itinerary-Opportunity link"""
    relation_type: Literal["itinerary_opportunity"] = "itinerary_opportunity"
    
    class Settings:
        name = "relations"

class PackageOpportunity(BaseRelation):
    """Package-Opportunity link"""
    relation_type: Literal["package_opportunity"] = "package_opportunity"
    
    class Settings:
        name = "relations"

class AccountContact(BaseRelation):
    """Account-Contact link"""
    relation_type: Literal["account_contact"] = "account_contact"
    
    class Settings:
        name = "relations"

class EntityTag(BaseRelation):
    """Entity-Tag link"""
    relation_type: Literal["entity_tag"] = "entity_tag"
    
    class Settings:
        name = "relations"

class OpportunityTeamMember(BaseRelation):
    """Opportunity-Team member link"""
    relation_type: Literal["opportunity_team"] = "opportunity_team"
    
    class Settings:
        name = "relations"

class AccountPinView(BaseRelation):
    """User pinned account view"""
    relation_type: Literal["account_pin"] = "account_pin"
    source_id: Indexed(PydanticObjectId)  # user_id
    target_id: Indexed(PydanticObjectId)    # view_id
    
    class Settings:
        name = "relations"

class EntityPinView(BaseRelation):
    """User pinned entity view"""
    relation_type: Literal["entity_pin"] = "entity_pin"
    source_id: Indexed(PydanticObjectId)  # user_id
    target_id: Indexed(PydanticObjectId)  # view_id
    
    class Settings:
        name = "relations"

class ReportFolderShare(BaseRelation):
    """Report folder sharing"""
    relation_type: Literal["report_folder_share"] = "report_folder_share"
    
    class Settings:
        name = "relations"

class FileShare(BaseRelation):
    """File sharing"""
    relation_type: Literal["file_share"] = "file_share"
    
    class Settings:
        name = "relations"

class RoleHierarchy(BaseRelation):
    """Role hierarchy (reports_to)"""
    relation_type: Literal["role_hierarchy"] = "role_hierarchy"
    source_id: Indexed(PydanticObjectId)  # role_id
    target_id: Indexed(PydanticObjectId)  # reports_to_role_id
    
    class Settings:
        name = "relations"
