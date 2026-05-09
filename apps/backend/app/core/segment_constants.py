"""
Segment constants for multi-tenant, multi-industry CRM.

Segment identifies the type of customer relationship:
 - B2C: Individual / person-account based opportunities
 - B2B: Corporate / organisation-account based opportunities
 - B2B_DIRECT: Direct B2B channel (non-corporate) opportunities

These values are stored on Lead, Opportunity, and propagated during
lead-conversion.  Every new segment value MUST be added here so that
dashboard KPI queries, API fallback logic, and UI dropdowns stay in sync.
"""


class Segment:
    """Canonical segment identifiers stored in MongoDB ``segment`` field."""

    B2C: str = "B2C"
    B2B: str = "B2B"              # Corporate (legacy / original B2B)
    B2B_DIRECT: str = "B2B_DIRECT"  # New direct B2B channel

    # Ordered list — used by admin UIs / reports that enumerate all segments
    ALL: list[str] = [B2C, B2B, B2B_DIRECT]

    # Convenience group: every B2B flavour (both corporate + direct)
    B2B_VARIANTS: list[str] = [B2B, B2B_DIRECT]

    # Display labels for API responses / exports
    LABELS: dict[str, str] = {
        B2C: "B2C (Individual)",
        B2B: "B2B (Corporate)",
        B2B_DIRECT: "B2B",
    }

    @classmethod
    def is_person_account(cls, segment: str | None) -> bool:
        """Return True when the segment maps to a person-account (B2C)."""
        return segment == cls.B2C or segment is None

    @classmethod
    def default_for_account(cls, is_person_account: bool) -> str:
        """Infer a default segment from the ``is_person_account`` flag.

        Used as a fallback when a record has no explicit segment value.
        Person-accounts default to B2C; organisation-accounts default to
        B2B (Corporate).
        """
        return cls.B2C if is_person_account else cls.B2B

    @classmethod
    def label(cls, segment: str | None) -> str:
        """Human-readable label for a segment value."""
        return cls.LABELS.get(segment or cls.B2C, segment or cls.B2C)
