"""
Generate apps/backend/MIGRATION.md ledger from docs/parity/old_routes.csv.

Run after every phase to refresh status from new_routes.csv comparisons.

Format:
| old_method | old_path | controller | new_method | new_path | status | phase | notes |
"""

from __future__ import annotations
import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PARITY = ROOT / "Tutterfly-main" / "docs" / "parity"
OLD_CSV = PARITY / "old_routes.csv"
NEW_CSV = PARITY / "new_routes.csv"
LEDGER = ROOT / "Tutterfly-main" / "apps" / "backend" / "MIGRATION.md"


# Phase mapping by controller / path keyword (from PHASES.md)
PHASE_RULES: list[tuple[str, str]] = [
    # Phase 1: custom fields, standard fields, picklists
    (r"AdditionalField|StandardField|sort_.*_fields|status_update_additional|mandatory_update_additional", "1"),
    (r"rest_addfield|rest_standard_fields|edit_.*_standard_fields|update_.*_standard_fields", "1"),
    (r"rest_salutations|rest_lead_statuses|rest_task_priorities|rest_sales_stages|rest_experiences|"
     r"rest_opportunity_tags|rest_itinerary_inclusions|rest_task_statuses|rest_inclusions|"
     r"rest_source|rest_source_medium|rest_destinations|supplier_rest_ratings|supplier_rest_types|"
     r"supplier_rest_services|rest_industries|rest_ratings|rest_categories", "1"),
    # Phase 2: settings hub
    (r"opp_settings|company_settings|leaderBoard|saveParameter|saveAccolade|savePerformance|"
     r"bank_update|logo_update|email_footer|auto-assignment|auto_assignment|country-wise-user|"
     r"department_settings|department_users|get_agent|agent_connect", "2"),
    # Phase 3: territory
    (r"rest_territories|rest_bd_report_list|get_destinations|get_regions|get_countries|"
     r"get_region_by_countries|get_country_by_destinations|get_update_admin_opportunity_region|"
     r"RestRegionController|RestTerritoryController", "3"),
    # Phase 4: views/columns/filters/pinned
    (r"rest_.*_views|rest_.*_columns|rest_.*_filters|rest_pin_views|rest_unpin_views|"
     r"rest_.*_additional_columns|AccountViewController|SupplierViewController|"
     r"ContactViewController|LeadViewController|OpportunityViewController|TaskViewController|"
     r"PersonalAccountViewController|.*ColumnController|PinViewController", "4"),
    # Phase 5: itineraries
    (r"itinerar|itinerary|tour|hotel|flight|header_footer|banner|inclusion|pdf_response|"
     r"call_pdf|check_pdf_status|profinvoice|proforma|day_destinations|day_descriptions|"
     r"day_inclusions|TourItinerar|ItineraryController|ScheduleItem|ItineraryFlight|"
     r"ItineraryHotel|ItineraryDay|ItineraryCategory|ItineraryPDF|HeaderFooter|"
     r"ProformaInvoice|ItineraryInclusion|UserItineraryInclusion", "5"),
    # Phase 6: opportunity workflow
    (r"departure|voucher|ledger|claim|hand-over|handover|capture_lead|automatic_capture|"
     r"_fb_leads|facebook_token|tenant_fb|external_lead|tenant_user_details|"
     r"opportunities_inclusions|opp_incl_supp|change_key_deals|checked_opportunity|"
     r"opportunity_teams|operation_owner|operation_assessment|send_rfq|"
     r"save_opp_schedule|opportunity_lock|automatic_lock|user_opportunity_unlock|"
     r"opportunities_shifed|opportunity_support|bd_opportunit|MyPipeline|"
     r"OpportunityClaim|HandOverOpportunity|RestOperationAssessment|LedgerAccount", "6"),
    # Phase 7: email/gmail/whatsapp/chatbot
    (r"chat-bot|whatsapp|createTemplate|deleteTemplate|getallTemplate|"
     r"google|gmail|fetch_mail|setup_gmail|email_client|conversations|"
     r"rest_email_image|rest_setup_mail|create_mail_setup|rest_email_templates|"
     r"rest_dynamic_email_template|ai_email|ChatBot|EmailReader|GoogleController|"
     r"RestEmailTemplate|Conversations", "7"),
    # Phase 8: reports
    (r"rest_st_report|user_st_report|active_user_report|account_contact_report|"
     r"leads_report|team_reports|report_lead_conversion|agent_departure_report|"
     r"rest_folders|rest_private_reports|rest_public_reports|rest_folders_created|"
     r"rest_shared_with_me_folders|rest_share_folders|rest_report_previews|"
     r"rest_reports_created_by_me|report_clone|format_data_export|rest_sample_download|"
     r"get_user_report|RestStandardReport|ReportFolder|RestReportPreview|"
     r"sampleFile|UserReport", "8"),
    # Phase 9: files/folders
    (r"rest_files|rest_share_files|rest_file_folders|recent_files_all|file_delete|"
     r"folder_delete|rest_share_folder|rest_shared_files|RestShare|RestFile|"
     r"RestFileFolder", "9"),
    # Phase 10: user mgmt
    (r"rest_profiles|rest_avatars|rest_banners|users_sales_target|updateCurrentTarget|"
     r"updateUserTargets|updateAllUserTargets|set_user_target|team_sales_target|"
     r"get_directory|get_user_status|update_user_status|directory_check|login_logs|"
     r"rest_bd_users|get_bd_user_detail|rest_auto_users|rest_users_deactivate|"
     r"rest_users_reactivate|update_user_sales_org|send_reset_pswd|get_all_users|"
     r"get_all_active_users|rest_role_hierarchies|RestProfile|RestUser|RestRoleHierarchy|"
     r"RestMonthlyPerformance", "10"),
    # Phase 11: dashboard
    (r"rest_dashboard|rest_user_activities|rest_leader_board|save_quick_links|"
     r"delete_quick_links|get_oppo_dashboard|get_my_oppo_dashboard|get_bd_.*_dashboard|"
     r"get_bd_.*_oppo|get_bd_.*_revenue|get_bd_.*_dep|get_bd_opp_graph|"
     r"get_bd_stage|opp_graph_performance|stage_percentage|team_performance|"
     r"rest_monthly_performance|countries_opportunities_updated|exp_opp|"
     r"DashboardController|RestHomeController", "11"),
    # Phase 12: search modules
    (r"rest_search_modules|rest_notes_add|rest_notes_get|rest_supplier_template|"
     r"get_supplier_template|RestSearchModule", "12"),
    # Phase 13: imports/exports
    (r"rest_field_lists|rest_.*_export|rest_.*_import|rest_import_lead_sync", "13"),
    # Phase 14: notifications/FCM/reminders
    (r"fcm_update|view_notification|check_notification|all_notification|"
     r"get_all_notification|storeToken|send_reminder|AppTokenMobile", "14"),
    # Phase 15: subscription/billing
    (r"create-product|create-plan|create-customer|create-subscription|getUserCheckoutDetail|"
     r"get-product|get-plans|get-single-plan|subscription_update|subscription_upgrade|"
     r"check-user-create|check-user-exception|check_tenant_subscription|user_plan_modules|"
     r"subscriptionController|RestBilling", "15"),
    # Phase 16: mobile API
    (r"_m$|_m/|RestAccountMobile|RestContactMobile|RestLeadMobile|RestOpportunityMobile|"
     r"RestPersonalAccountMobile|RestFileFolderMobile|DashboardMobile", "16"),
    # Phase 17: misc
    (r"php_info|check_tenant_activity|get_s3_url|get_lat_long|search_country|"
     r"verify|access_login|logout|UserPasswordReset|operators|countries|states|cities|"
     r"rest_ratings|rest_industries|rest_categories|RestRating|RestIndustry|RestCategory|"
     r"RestSalesStage|RestSalutation|RestLeadStatus|RestTaskStatus|RestTaskPriority|"
     r"RestExperience|RestOpportunityTag|RestInclusion|RestSource|RestDestination|"
     r"PinView|RestEmailFooter|RestSchedulerSetting|SchedulerSetting|"
     r"RestIncentive|RestDepartmentSetting|RestRegion|RestRoleHierarchy|"
     r"RestMonthlyPerformance|HandOverOpportunity|OpportunityClaim", "17"),
]


def assign_phase(method: str, path: str, controller: str, action: str) -> str:
    blob = " ".join([method, path, controller, action])
    for pattern, phase in PHASE_RULES:
        if re.search(pattern, blob, re.IGNORECASE):
            return phase
    return "?"


def load_new_routes() -> tuple[set[tuple[str, str]], list[dict]]:
    """Load already-implemented routes for matching."""
    if not NEW_CSV.exists():
        return set(), []
    exact = set()
    rows = []
    with NEW_CSV.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            path = re.sub(r"\{[^}]+\}", "{id}", row["path"].lower())
            path = path.replace("/api/v1", "")
            exact.add((row["method"], path))
            rows.append({"method": row["method"], "path": path, "raw": row["path"]})
    return exact, rows


def _tokens(p: str) -> set[str]:
    return {t for t in re.split(r"[/_\-]", p) if t and t != "{id}" and t != "rest"}


def find_match(method: str, path: str,
               exact: set[tuple[str, str]],
               new_rows: list[dict]) -> tuple[str, str] | None:
    norm = re.sub(r"\{[^}]+\}", "{id}", path.lower())
    if (method, norm) in exact:
        return (method, norm)
    # fuzzy: same method, ≥0.5 token overlap
    otoks = _tokens(norm)
    if not otoks:
        return None
    best = None
    best_score = 0.0
    for nr in new_rows:
        if nr["method"] != method:
            continue
        ntoks = _tokens(nr["path"])
        if not (otoks & ntoks):
            continue
        score = len(otoks & ntoks) / max(len(otoks | ntoks), 1)
        if score > best_score:
            best_score = score
            best = nr
    if best and best_score >= 0.5:
        return (best["method"], best["raw"])
    return None


def main():
    exact, new_rows = load_new_routes()
    rows = []
    with OLD_CSV.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            phase = assign_phase(row["method"], row["path"], row["controller"], row["action"])
            match = find_match(row["method"], row["path"], exact, new_rows)
            if match:
                status = "ported"
                new_path = f"{match[0]} {match[1]}"
            else:
                status = "missing"
                new_path = ""
            rows.append({
                "old_method": row["method"],
                "old_path": row["path"],
                "controller": row["controller"],
                "action": row["action"],
                "new_path": new_path,
                "status": status,
                "phase": phase,
                "notes": "",
            })

    # Stats
    by_phase: dict[str, dict[str, int]] = {}
    for r in rows:
        by_phase.setdefault(r["phase"], {"missing": 0, "ported": 0, "renamed": 0, "decommissioned": 0})
        by_phase[r["phase"]][r["status"]] = by_phase[r["phase"]].get(r["status"], 0) + 1

    total = len(rows)
    ported = sum(1 for r in rows if r["status"] == "ported")
    missing = sum(1 for r in rows if r["status"] == "missing")

    md = []
    md.append("# Tutterfly Migration Ledger")
    md.append("")
    md.append("Auto-generated by `docs/parity/build_migration.py`. Re-run after every phase to refresh.")
    md.append("")
    md.append(f"**Total old routes**: {total} · **Ported**: {ported} · **Missing**: {missing}")
    md.append("")
    md.append("## Per-phase progress")
    md.append("")
    md.append("| Phase | Total | Ported | Missing | % done |")
    md.append("|---|---|---|---|---|")
    for phase in sorted(by_phase.keys(), key=lambda p: (p == "?", int(p) if p.isdigit() else 99)):
        s = by_phase[phase]
        t = sum(s.values())
        pct = (s.get("ported", 0) / t * 100) if t else 0
        md.append(f"| {phase} | {t} | {s.get('ported', 0)} | {s.get('missing', 0)} | {pct:.1f}% |")
    md.append("")
    md.append("## Ledger (ordered by phase, then path)")
    md.append("")
    md.append("| Phase | Method | Old path | Controller | Action | Status | New path | Notes |")
    md.append("|---|---|---|---|---|---|---|---|")
    rows_sorted = sorted(rows, key=lambda r: (r["phase"], r["old_path"]))
    for r in rows_sorted:
        md.append(
            f"| {r['phase']} | {r['old_method']} | `{r['old_path']}` | "
            f"{r['controller']} | {r['action']} | {r['status']} | "
            f"{r['new_path'] or '—'} | {r['notes']} |"
        )

    LEDGER.write_text("\n".join(md), encoding="utf-8")
    print(f"Wrote {LEDGER} ({len(rows)} rows, {ported} ported, {missing} missing)")


if __name__ == "__main__":
    main()
