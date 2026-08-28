"""Referrals API — healthcare CRM vertical."""
from app.api.factories.crud_router import make_crud_router
from app.models.healthcare.referral import Referral
from app.schemas.healthcare.referral import (
    ReferralCreate,
    ReferralResponse,
    ReferralUpdate,
)

router = make_crud_router(
    model=Referral,
    create_schema=ReferralCreate,
    update_schema=ReferralUpdate,
    response_schema=ReferralResponse,
    module_name="referrals",
    permission_prefix="referral",
)
