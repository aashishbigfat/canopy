from app.services.website_lead_mapper import (
    OLD_DEFAULT_FYEAR,
    UNPARSEABLE_TRAVEL_DATE,
    WEBSITE_CAPTURE_CUSTOM_FIELDS,
    clean_value,
    crm_phone,
    map_website_lead,
    old_record_number,
    old_travel_date,
    split_name,
)


def _website_lead(**overrides):
    """Shape of the `lead` object dookwebsite's InquiryController sends."""
    lead = {
        "first_name": "",
        "last_name": "Ravi Kumar",
        "city": "New Delhi",
        "region": "National Capital Territory of Delhi",
        "country": "India",
        "email": " ravi@example.com ",
        "mobile": "9876543210",
        "phone": "9876543210",
        "company": None,
        "no_of_nights": "",
        "url": "https://dook.bigfat.ai/tours/almaty",
        "destination_json": "",
        "destinations_name": "Almaty, Kazakhstan",
        "min_country_data": "",
        "fixed_departure": "no",
        "form_type": "",
        "experience": None,
        "website": "",
        "campaign_name": "Dook Country - Kazakhstan",
        "source": "web",
        "source_medium": "",
        "ref_id": "DOOK-123",
        "no_of_pax": "4",
        "ip": "1.2.3.4",
        "travel_date": "2026-10-01",
        "dook_enquiry_id": 123,
        "departure_id": "",
        "custom_fields": {
            "segment": "",
            "destination": "Kazakhstan",
            "description": "",
            "no_of_passengers": "4",
            "date_of_travel": "2026-10-01",
            "bnpl": "No",
            "campaign_url": "https://dook.bigfat.ai/tours/almaty",
            "experience": None,
        },
    }
    lead.update(overrides)
    return lead


def test_clean_value_trims_and_nulls_empty_strings():
    assert clean_value({"a": "  x ", "b": "", "c": ["", " y"], "d": 5}) == {
        "a": "x", "b": None, "c": [None, "y"], "d": 5,
    }


def test_split_name_matches_old_crm():
    assert split_name(None, "Ravi Kumar Singh") == ("Ravi", "Kumar")
    assert split_name(None, "Ravi") == ("", "Ravi")
    assert split_name("Asha", "Rao") == ("Asha", "Rao")
    assert split_name(None, None) == ("", "")


def test_old_travel_date_formats():
    assert old_travel_date("2026-09-14") == "2026-09-14"
    assert old_travel_date("May 2027") == "2027-05-01"
    assert old_travel_date("2027-05") == "2027-05-01"
    assert old_travel_date("not a date") == UNPARSEABLE_TRAVEL_DATE
    assert old_travel_date(None) is None


def test_crm_phone_only_converts_unambiguous_numbers():
    assert crm_phone("9876543210", "India") == "+91 9876543210"
    assert crm_phone("919876543210", "India") == "+91 9876543210"
    assert crm_phone("+91 9876543210", "India") == "+91 9876543210"
    assert crm_phone("+44 7911123456", "United Kingdom") == "+44 7911123456"
    assert crm_phone("2025550143", "United States") == "2025550143"
    assert crm_phone("98765", "India") == "98765"
    assert crm_phone(None, "India") is None


def test_old_record_number_is_zero_padded_old_id():
    assert old_record_number("12345") == "0000012345"
    assert old_record_number("") is None
    assert old_record_number(None) is None
    assert old_record_number("abc") is None


def test_map_website_lead_core_fields():
    mapped = map_website_lead(_website_lead())
    assert (mapped["first_name"], mapped["last_name"]) == ("Ravi", "Kumar")
    assert mapped["title"] is None
    assert mapped["email"] == "ravi@example.com"
    assert (mapped["mobile"], mapped["mobile_raw"]) == ("+91 9876543210", "9876543210")
    assert mapped["state"] == "Delhi"
    assert mapped["country_of_origin"] == "India"
    assert mapped["form_id"] == "DOOK-123"
    assert mapped["no_of_pax"] == 4
    assert mapped["no_of_nights"] is None
    assert mapped["travel_date"] == "2026-10-01"
    assert mapped["source"] == "web"
    assert mapped["source_medium"] == "Organic"
    assert mapped["website"] is None
    assert mapped["departure_id"] is None


def test_destinations_name_wins_and_is_split_for_lookup():
    mapped = map_website_lead(_website_lead())
    assert mapped["destination"] == "Almaty, Kazakhstan"
    assert mapped["destination_names"] == ["Almaty", "Kazakhstan"]

    fallback = map_website_lead(_website_lead(destinations_name=""))
    assert fallback["destination"] == "Kazakhstan"


def test_fixed_departure_flags():
    assert map_website_lead(_website_lead(fixed_departure="yes"))["is_fixed"] is True
    assert map_website_lead(_website_lead(fixed_departure="yes"))["lead_qhb"] == "F"
    assert map_website_lead(_website_lead(fixed_departure="no"))["is_fixed"] is False
    missing = map_website_lead(_website_lead(fixed_departure=None))
    assert (missing["is_fixed"], missing["lead_qhb"]) == (None, "O")


def test_bnpl_and_old_custom_field_values():
    mapped = map_website_lead(_website_lead())
    assert mapped["bnpl_flag"] == "N"
    assert map_website_lead(
        _website_lead(custom_fields={"bnpl": "Yes"})
    )["bnpl_flag"] == "Y"

    values = mapped["custom_field_values"]
    assert values["bnpl"] == "No"
    assert values["segment"] is None
    assert values["destination"] == "Almaty, Kazakhstan"
    assert values["fyear"] == OLD_DEFAULT_FYEAR


def test_form_type_becomes_source_medium():
    mapped = map_website_lead(_website_lead(source_medium="B2B Partnership Form"))
    assert mapped["source_medium"] == "B2B Partnership Form"


def test_custom_field_names_are_unique():
    names = [name.lower() for name, _ in WEBSITE_CAPTURE_CUSTOM_FIELDS]
    assert len(names) == len(set(names))
