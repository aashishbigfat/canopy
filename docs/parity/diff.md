# Old → New API parity diff (auto-generated)

- OLD endpoints parsed: **1050**
- NEW endpoints parsed: **702**
- Matched (exact or fuzzy ≥0.5): **462**
- Missing in new: **588**

## Missing endpoints, grouped by old controller

### AccountColumnController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_accounts_additional_columns` | update_additional_columns | auth_or_public |
| PATCH | `/rest_accounts_columns/{id}` | update | auth_or_public:resource |

### AccountViewController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/rest_accounts_views/{id}` | update | auth_or_public:resource |

### AdditionalFieldAccountController (5)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/status_update_additional_field` | status_update | auth_or_public |
| POST | `/mandatory_update_additional_field` | mandatory_update | auth_or_public |
| GET | `/rest_addfield_accounts_active` | showActiveFields | auth_or_public |
| GET | `/admin_addfield_accounts_active` | showAdminActiveFields | auth_or_public |
| PATCH | `/rest_addfield_accounts/{id}` | update | auth_or_public:resource |

### AdditionalFieldContactController (4)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_addfield_contacts_active` | showActiveFields | auth_or_public |
| GET | `/admin_addfield_contacts_active` | showAdminActiveFields | auth_or_public |
| GET | `/rest_addfield_contacts_active` | showActiveFields | auth_or_public |
| PATCH | `/rest_addfield_contacts/{id}` | update | auth_or_public:resource |

### AdditionalFieldLeadController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_addfield_leads_active` | showActiveFields | auth_or_public |
| GET | `/admin_addfield_leads_active` | showAdminActiveFields | auth_or_public |
| GET | `/rest_addfield_leads_active` | showActiveFields | auth_or_public |
| GET | `/admin_addfield_leads_active` | showAdminActiveFields | auth_or_public |
| PATCH | `/rest_addfield_leads/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_addfield_leads/{id}` | update | auth_or_public:resource |

### AdditionalFieldOpportunityController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_addfield_o_a` | showActiveFields | auth_or_public |
| GET | `/admin_addfield_o_a` | showAdminActiveFields | auth_or_public |
| PATCH | `/rest_addfield_opportunities/{id}` | update | auth_or_public:resource |

### AdditionalFieldPersonalAccountController (7)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_addfield_pa_a` | showActiveFields | auth_or_public |
| GET | `/admin_addfield_pa_a` | showAdminActiveFields | auth_or_public |
| POST | `/sort_personal_accounts_fields` | sort_fields | auth_or_public |
| POST | `/rest_addfield_personal_accounts` | store | auth_or_public:resource |
| PUT | `/rest_addfield_personal_accounts/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_addfield_personal_accounts/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_addfield_personal_accounts/{id}` | destroy | auth_or_public:resource |

### AdditionalFieldSupplierController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_addfield_suppliers_active` | showActiveFields | auth_or_public |
| GET | `/admin_addfield_suppliers_active` | showAdminActiveFields | auth_or_public |
| PATCH | `/rest_addfield_suppliers/{id}` | update | auth_or_public:resource |

### AppTokenMobileController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/storeToken` | storeToken | auth_or_public |

### ChatBotController (12)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/config-webhook` | configureWebhook | auth_or_public |
| POST | `/chat-bot` | listenToReplies | auth_or_public |
| POST | `/chat-bot-test` | testreplies | auth_or_public |
| GET | `/get-all-templates` | getallTemplate | auth_or_public |
| POST | `/createTemplate` | createTemplate | auth_or_public |
| POST | `/deleteTemplate` | deleteTemplate | auth_or_public |
| POST | `/send-whatsapp-message` | sendWhatsAppMessageApi | auth_or_public |
| POST | `/check-valid-whatsapp-user` | checkValidWhatsappno | auth_or_public |
| POST | `/send-whatsapp-media` | uploadMedia | auth_or_public |
| POST | `/get-media` | getMedia | auth_or_public |
| POST | `/send-whatsapp-message` | sendWhatsAppMessageApi | auth_or_public |
| POST | `/send-whatsapp-template` | sendWhatsAppTemplate | auth_or_public |

### ContactColumnController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_contact_additional_columns` | update_additional_columns | auth_or_public |
| PATCH | `/rest_contacts_columns/{id}` | update | auth_or_public:resource |

### ContactViewController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/rest_contacts_views/{id}` | update | auth_or_public:resource |

### DashboardController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/dashboard` | dashboard | admin |

### DashboardMobileController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_dashboard_m` | restDashboard | auth_or_public |

### ForgotPasswordController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/UserPasswordReset` | sendResetEmail | auth_or_public |

### GoogleController (10)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/googleAuth` | googleAuth | auth_or_public |
| POST | `/fetch_mail` | fetch_mail | auth_or_public |
| POST | `/get_mail` | get_mail | auth_or_public |
| POST | `/get_gmail_token` | get_gmail_token | auth_or_public |
| POST | `/send_mail_gmail` | send_mail_gmail | auth_or_public |
| POST | `/get_attachment` | get_attachment | auth_or_public |
| POST | `/get_singleMail` | getMesageDetail | auth_or_public |
| POST | `/search_gmail` | Search | auth_or_public |
| POST | `/shync-gmail` | gmailSync | auth_or_public |
| POST | `/gmail-testing` | test | auth_or_public |

### HandOverOpportunityController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/hand-over-opportunity` | handOverOpportunity | auth_or_public |

### HeaderFooterController (4)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/header_footer_type` | headerFooterType | auth_or_public |
| PUT | `/rest_header_footers/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_header_footers/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_header_footers/{id}` | destroy | auth_or_public:resource |

### ItineraryCategoryController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_itinerary_categories` | index | auth_or_public:resource |
| POST | `/rest_itinerary_categories` | store | auth_or_public:resource |
| GET | `/rest_itinerary_categories/{id}` | show | auth_or_public:resource |
| PUT | `/rest_itinerary_categories/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_itinerary_categories/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_itinerary_categories/{id}` | destroy | auth_or_public:resource |

### ItineraryController (5)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/delete_itinerary` | deleteItinerary | auth_or_public |
| GET | `/rest_opp_itinerary_create` | oppCreateItinerary | auth_or_public |
| POST | `/rest_opp_itinerary_attach` | oppAttachItinerary | auth_or_public |
| POST | `/itinerary_banner_image` | bannerImage | auth_or_public |
| PATCH | `/rest_itineraries/{id}` | update | auth_or_public:resource |

### ItineraryDayController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_itinerary_days` | index | auth_or_public:resource |
| POST | `/rest_itinerary_days` | store | auth_or_public:resource |
| GET | `/rest_itinerary_days/{id}` | show | auth_or_public:resource |
| PUT | `/rest_itinerary_days/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_itinerary_days/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_itinerary_days/{id}` | destroy | auth_or_public:resource |

### ItineraryFlightController (13)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/search_flight` | search_flights | auth_or_public |
| GET | `/rest_itinerary_flights` | index | auth_or_public:resource |
| POST | `/rest_itinerary_flights` | store | auth_or_public:resource |
| GET | `/rest_itinerary_flights/{id}` | show | auth_or_public:resource |
| PUT | `/rest_itinerary_flights/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_itinerary_flights/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_itinerary_flights/{id}` | destroy | auth_or_public:resource |
| GET | `/rest_itinerary_flights_new` | index | auth_or_public:resource |
| POST | `/rest_itinerary_flights_new` | store | auth_or_public:resource |
| GET | `/rest_itinerary_flights_new/{id}` | show | auth_or_public:resource |
| PUT | `/rest_itinerary_flights_new/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_itinerary_flights_new/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_itinerary_flights_new/{id}` | destroy | auth_or_public:resource |

### ItineraryHotelController (8)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/hotel_list/{id}` | hotelList | auth_or_public |
| GET | `/testing_purpose/{id}` | testingPurpose | auth_or_public |
| GET | `/rest_itinerary_hotels` | index | auth_or_public:resource |
| POST | `/rest_itinerary_hotels` | store | auth_or_public:resource |
| GET | `/rest_itinerary_hotels/{id}` | show | auth_or_public:resource |
| PUT | `/rest_itinerary_hotels/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_itinerary_hotels/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_itinerary_hotels/{id}` | destroy | auth_or_public:resource |

### ItineraryInclusionController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_itinerary_inclusions` | index | auth_or_public:resource |
| POST | `/rest_itinerary_inclusions` | store | auth_or_public:resource |
| GET | `/rest_itinerary_inclusions/{id}` | show | auth_or_public:resource |
| PUT | `/rest_itinerary_inclusions/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_itinerary_inclusions/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_itinerary_inclusions/{id}` | destroy | auth_or_public:resource |

### ItineraryPDFController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/itinerary_pdf/{id}` | itineraryPDF | auth_or_public |

### ItinerarySubCategoryController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| PUT | `/rest_itinerary_sub_categories/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_itinerary_sub_categories/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_itinerary_sub_categories/{id}` | destroy | auth_or_public:resource |

### ItinerarynewController (9)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/get_all_inclusions` | getAllInclusions | auth_or_public |
| POST | `/update_day_inclusions` | update_day_inclusions | auth_or_public |
| POST | `/send_itinerary_email` | send_itinerary_email | auth_or_public |
| GET | `/search_itinerary_new` | searchItineraryNew | auth_or_public |
| GET | `/itinerary_flights_details/{id}` | itineraryFlightsDetails | auth_or_public |
| POST | `/send_itinerary_email` | send_itinerary_email | auth_or_public |
| POST | `/update_day_destinations` | update_day_destinations | auth_or_public |
| POST | `/update_day_descriptions` | update_day_descriptions | auth_or_public |
| PATCH | `/rest_itineraries_new/{id}` | update | auth_or_public:resource |

### LeadColumnController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_leads_additional_columns` | update_additional_columns | auth_or_public |
| PATCH | `/rest_leads_columns/{id}` | update | auth_or_public:resource |

### LeadViewController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/rest_leads_views/{id}` | update | auth_or_public:resource |

### LedgerAccountController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_ledger_account` | store | auth_or_public |
| POST | `/rest_ledger_account_edit` | editStore | auth_or_public |

### LoginController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/fcm_update` | updateFCMToken | auth_or_public |
| POST | `/logout_all` | logout_all | auth_or_public |

### MyPipelineController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_opps_mypipeline` | myPipeLine | auth_or_public |

### NewBdOpportunityController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/bd_opportunities_view` | dropViewOpportunity | auth_or_public |
| GET | `/bd_opportunities_columns/{id}` | changeColumns | auth_or_public |
| PATCH | `/bd_opportunities/{id}` | update | auth_or_public:resource |

### NewItineraryPdfController (4)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/pdf_response` | pdf_response | auth_or_public |
| GET | `/pdf_response_app` | pdf_response_app | auth_or_public |
| GET | `/itinerary_pdf_new/{itinerary_type}/{id}/{template_id}/{template_type_id}` | itineraryPDF | auth_or_public |
| GET | `/call_pdf` | callPdf | auth_or_public |

### OpportunityColumnController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_oppo_additional_columns` | update_additional_columns | auth_or_public |
| PATCH | `/rest_opportunities_columns/{id}` | update | auth_or_public:resource |

### OpportunityViewController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/rest_opportunities_views/{id}` | update | auth_or_public:resource |

### PersonalAccountColumnController (5)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_personal_accounts_additional_columns` | update_additional_columns | auth_or_public |
| POST | `/rest_personal_accounts_columns` | store | auth_or_public:resource |
| PUT | `/rest_personal_accounts_columns/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_personal_accounts_columns/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_personal_accounts_columns/{id}` | destroy | auth_or_public:resource |

### PersonalAccountViewController (5)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_personal_accounts_filters` | postFilter | auth_or_public |
| POST | `/rest_personal_accounts_views` | store | auth_or_public:resource |
| PUT | `/rest_personal_accounts_views/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_personal_accounts_views/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_personal_accounts_views/{id}` | destroy | auth_or_public:resource |

### PinViewController (12)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_pin_views_opp` | pin_view_opp | auth_or_public |
| POST | `/rest_unpin_views_opp` | unpin_opp | auth_or_public |
| POST | `/rest_pin_views_account` | pin_view_account | auth_or_public |
| POST | `/rest_pin_views_supplier` | pin_view_supplier | auth_or_public |
| POST | `/rest_unpin_views_account` | unpin_account | auth_or_public |
| POST | `/rest_unpin_views_supplier` | unpin_supplier | auth_or_public |
| POST | `/rest_pin_views_contact` | pin_view_contact | auth_or_public |
| POST | `/rest_unpin_views_contact` | unpin_contact | auth_or_public |
| POST | `/rest_pin_views_pa` | pin_view_pa | auth_or_public |
| POST | `/rest_unpin_views_pa` | unpin_pa | auth_or_public |
| POST | `/rest_pin_views_lead` | pin_view_lead | auth_or_public |
| POST | `/rest_unpin_views_lead` | unpin_lead | auth_or_public |

### ProformaInvoiceController (4)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/gen_proforma_invoices/{id}` | genPerformaInvoice | auth_or_public |
| GET | `/rest_profinvoice_download` | downloadProformaInvoice | auth_or_public |
| POST | `/rest_profinvoice_email` | sendEmail | auth_or_public |
| PATCH | `/rest_proforma_invoices/{id}` | update | auth_or_public:resource |

### ReportFolderController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/rest_folders/{id}` | update | auth_or_public:resource |

### ReportFolderListController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_folders_list` | index | auth_or_public:resource |
| POST | `/rest_folders_list` | store | auth_or_public:resource |
| GET | `/rest_folders_list/{id}` | show | auth_or_public:resource |
| PUT | `/rest_folders_list/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_folders_list/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_folders_list/{id}` | destroy | auth_or_public:resource |

### RestAccountController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_accounts_s_emails` | searchEmail | auth_or_public |
| PATCH | `/rest_accounts/{id}` | update | auth_or_public:resource |

### RestAccountMergeController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_merge_accounts_compare` | AccountCompare | auth_or_public |
| PATCH | `/rest_merge_accounts/{id}` | update | auth_or_public:resource |

### RestAccountMobileController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/rest_accounts_m/{id}` | update | auth_or_public:resource |

### RestBdOpportunityController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/rest_bd_opportunities/{id}` | update | auth_or_public:resource |

### RestBdPersonalAccountController (4)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_bd_personal_accounts` | store | auth_or_public:resource |
| PUT | `/rest_bd_personal_accounts/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_bd_personal_accounts/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_bd_personal_accounts/{id}` | destroy | auth_or_public:resource |

### RestBillingController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/billing` | billingDetails | admin |

### RestCategoryController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/rest_categories` | index | admin:resource |
| POST | `/admin/rest_categories` | store | admin:resource |
| GET | `/admin/rest_categories/{id}` | show | admin:resource |
| PUT | `/admin/rest_categories/{id}` | update | admin:resource |
| PATCH | `/admin/rest_categories/{id}` | update | admin:resource |
| DELETE | `/admin/rest_categories/{id}` | destroy | admin:resource |

### RestCompanySettingsController (4)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/bank_update` | bankUpdate | admin |
| POST | `/admin/logo_update` | logoUpdate | admin |
| PATCH | `/admin/rest_company_settings/{id}` | update | admin:resource |
| DELETE | `/admin/rest_company_settings/{id}` | destroy | admin:resource |

### RestContactController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_contacts_s_emails` | searchEmail | auth_or_public |
| PATCH | `/rest_contacts/{id}` | update | auth_or_public:resource |

### RestContactMobileController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/rest_contacts_m/{id}` | update | auth_or_public:resource |

### RestCountryState (2)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/states` | getStates | auth_or_public |
| POST | `/cities` | getCities | auth_or_public |

### RestDestinationController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/rest_get_states` | get_states | admin |
| POST | `/admin/rest_get_cities` | get_cities | admin |
| PATCH | `/rest_destinations/{id}` | update | auth_or_public:resource |

### RestEmailController (4)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_setup_mail` | setupEmail | auth_or_public |
| PUT | `/rest_emails/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_emails/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_emails/{id}` | destroy | auth_or_public:resource |

### RestEmailFooterController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/rest_email_footers` | index | admin:resource |
| POST | `/admin/rest_email_footers` | store | admin:resource |
| GET | `/admin/rest_email_footers/{id}` | show | admin:resource |
| PUT | `/admin/rest_email_footers/{id}` | update | admin:resource |
| PATCH | `/admin/rest_email_footers/{id}` | update | admin:resource |
| DELETE | `/admin/rest_email_footers/{id}` | destroy | admin:resource |

### RestEmailFooterUserController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_email_footer_user` | storeEFUser | auth_or_public |

### RestEmailTemplateController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_dynamic_email_template_column` | getDyanmicColumnInEmailTemplate | auth_or_public |
| PATCH | `/rest_email_templates/{id}` | update | auth_or_public:resource |

### RestEventController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/rest_events/{id}` | update | auth_or_public:resource |

### RestExperienceController (5)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/sort_experiences_fields` | sort_fields | admin |
| POST | `/rest_experiences` | store | auth_or_public:resource |
| PUT | `/rest_experiences/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_experiences/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_experiences/{id}` | destroy | auth_or_public:resource |

### RestFileController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_files_new/{id}` | updateNewVersion | auth_or_public |
| GET | `/file_delete/{id}` | deleteFile | auth_or_public |
| PATCH | `/rest_files/{id}` | update | auth_or_public:resource |

### RestFileFolderController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_share_folder_list` | shareFolderList | auth_or_public |
| GET | `/folder_delete/{id}` | deleteFolder | auth_or_public |
| POST | `/rest_file_folders` | store | auth_or_public:resource |
| PUT | `/rest_file_folders/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_file_folders/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_file_folders/{id}` | destroy | auth_or_public:resource |

### RestFileFolderMobileController (4)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_file_folders_m` | store | auth_or_public:resource |
| PUT | `/rest_file_folders_m/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_file_folders_m/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_file_folders_m/{id}` | destroy | auth_or_public:resource |

### RestHomeController (30)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/leaderBoardSettings` | leaderBoardSettings | admin |
| POST | `/admin/saveParameter` | saveParameter | admin |
| POST | `/admin/saveAccolade` | saveAccolade | admin |
| POST | `/admin/savePerformance` | savePerformance | admin |
| GET | `/send_reminder` | send_reminder | auth_or_public |
| POST | `/capture_lead` | captureLead | auth_or_public |
| POST | `/check_capture_leads` | checkCaptureLeads | auth_or_public |
| POST | `/check_capture_leads_ref_id` | checkCaptureLeadsRefId | auth_or_public |
| POST | `/capture_lead_facebook` | captureLeadFacebook | auth_or_public |
| POST | `/automatic_capture` | saveAutomaticFbLead | auth_or_public |
| GET | `/get_s3_url` | get_s3_url | auth_or_public |
| GET | `/pull_leads_fb` | pullLeadFb | auth_or_public |
| GET | `/delete_external_lead/{id}` | deleteExternalLead | auth_or_public |
| POST | `/save_fb_leads` | convertFBIntoLead | auth_or_public |
| GET | `/check_tenant_fb` | checkTenantFb | auth_or_public |
| GET | `/rest_leader_board` | leaderBoard | auth_or_public |
| GET | `/team_sales_target` | teamSalesTarget | auth_or_public |
| GET | `/get_oppo_dashboard` | getOppoDashboard | auth_or_public |
| GET | `/get_bd_oppo_dashboard` | getBdOppDashboard | auth_or_public |
| GET | `/get_bd_dashboard_today_oppo` | getBdOppDashboardTodayOppo | auth_or_public |
| GET | `/get_bd_dashboard_tomorrow_dep` | getBdOppDashboardTomorrow | auth_or_public |
| GET | `/get_bd_user_detail` | bdUser | auth_or_public |
| GET | `/get_my_oppo_dashboard` | getMyOppoDashboard | auth_or_public |
| GET | `/opp_graph_performance` | opp_graph_performance | auth_or_public |
| GET | `/opp_graph_performance_test` | opp_graph_performance_test | auth_or_public |
| POST | `/set_user_target` | set_user_target | auth_or_public |
| GET | `/get_directory` | getDirectory | auth_or_public |
| GET | `/get_user_status` | getUserStatus | auth_or_public |
| POST | `/update_user_status` | updateUserStatus | auth_or_public |
| GET | `/email_client/emails` | emails | auth_or_public |

### RestIncentiveBoardController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_leader_board-user` | userBoard | auth_or_public |

### RestIncentiveCalculateController (7)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/get_update_admin_opportunity_region` | incentiveCalculationOpportunitiesUpdateRegion | admin |
| GET | `/incentive` | index | auth_or_public:resource |
| POST | `/incentive` | store | auth_or_public:resource |
| GET | `/incentive/{id}` | show | auth_or_public:resource |
| PUT | `/incentive/{id}` | update | auth_or_public:resource |
| PATCH | `/incentive/{id}` | update | auth_or_public:resource |
| DELETE | `/incentive/{id}` | destroy | auth_or_public:resource |

### RestIncentiveCalculationController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/user_month_incentive` | monthlyIncentiveCalcuation | admin |

### RestIncentiveController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/incentive_matrix` | index | admin:resource |
| POST | `/admin/incentive_matrix` | store | admin:resource |
| GET | `/admin/incentive_matrix/{id}` | show | admin:resource |
| PUT | `/admin/incentive_matrix/{id}` | update | admin:resource |
| PATCH | `/admin/incentive_matrix/{id}` | update | admin:resource |
| DELETE | `/admin/incentive_matrix/{id}` | destroy | admin:resource |

### RestIncentiveDepartmentController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| PUT | `/admin/incentive_department/{id}` | update | admin:resource |
| PATCH | `/admin/incentive_department/{id}` | update | admin:resource |
| DELETE | `/admin/incentive_department/{id}` | destroy | admin:resource |

### RestInclusionController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/sort_inclusions_fields` | sort_fields | admin |
| PUT | `/rest_inclusions/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_inclusions/{id}` | update | auth_or_public:resource |

### RestIndustryController (7)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/sort_industry_fields` | sort_fields | admin |
| GET | `/rest_industries` | index | auth_or_public:resource |
| POST | `/rest_industries` | store | auth_or_public:resource |
| GET | `/rest_industries/{id}` | show | auth_or_public:resource |
| PUT | `/rest_industries/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_industries/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_industries/{id}` | destroy | auth_or_public:resource |

### RestLeadController (8)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/lead_counter` | leadCounter | admin |
| POST | `/admin/lead_counter_separator` | leadCounterSeparator | admin |
| GET | `/lead_counter` | leadCounter | auth_or_public |
| GET | `/get_fb_leads` | getFbLeads | auth_or_public |
| GET | `/rest_leads_s_emails` | searchEmail | auth_or_public |
| GET | `/rest_leads_s_emails` | searchEmail | auth_or_public |
| GET | `/rest_import_lead_sync` | leadSyncTableData | auth_or_public |
| PATCH | `/rest_leads/{id}` | update | auth_or_public:resource |

### RestLeadMobileController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/rest_leads_m/{id}` | update | auth_or_public:resource |

### RestLeadStatusController (7)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/sort_lead_statuses_fields` | sort_fields | admin |
| GET | `/rest_lead_statuses` | index | auth_or_public:resource |
| POST | `/rest_lead_statuses` | store | auth_or_public:resource |
| GET | `/rest_lead_statuses/{id}` | show | auth_or_public:resource |
| PUT | `/rest_lead_statuses/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_lead_statuses/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_lead_statuses/{id}` | destroy | auth_or_public:resource |

### RestMonthIncentiveController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/user/incentive/monthly_target/history/{id}` | userMonthAchievement | auth_or_public |
| GET | `/user/redeem_point/transaction/{id}` | userRedeemPointTransaction | auth_or_public |
| POST | `/user/claim_point/transaction` | userClaimTransaction | auth_or_public |

### RestOperationAssessmentController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/operation_assessment` | operationAssessment | auth_or_public |

### RestOpportunityController (39)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/automatic_lock` | automaticOppoLocked | auth_or_public |
| GET | `/opportunity_lock/{id}` | oppoLocked | auth_or_public |
| GET | `/v1/sources` | getSourcesNode | auth_or_public |
| GET | `/v1/source_media` | getSourceMediaNode | auth_or_public |
| GET | `/v1/opportunity_views` | getOpportunityViewNode | auth_or_public |
| GET | `/v1/opportunity_tags` | getOpportunityTagNode | auth_or_public |
| GET | `/v1/inclusions` | getInclusionsNode | auth_or_public |
| GET | `/v1/experiences` | getExperiencesNode | auth_or_public |
| GET | `/v1/account_types` | getAccountTypeNode | auth_or_public |
| GET | `/v1/additional_fields_opportunities` | getAdditionalFieldsOpportunities | auth_or_public |
| GET | `/v1/operators` | getOperators | auth_or_public |
| GET | `/v1/opportunity_columns` | getOpportunityColumns | auth_or_public |
| GET | `/v1/states` | getAllStates | auth_or_public |
| GET | `/v1/cities` | getAllCities | auth_or_public |
| GET | `/v1/opportunities/pipeline` | myPipelineOpportunities | auth_or_public |
| POST | `/save_opp_schedule` | addPaymentSchedule | auth_or_public |
| POST | `/save_opp_schedule_received` | addPaymentScheduleReceived | auth_or_public |
| POST | `/opp_incl_supp_amt` | oppInclSuppListUpdate | auth_or_public |
| GET | `/get_user_today_pipeline/{user_id}` | get_user_today_pipeline | auth_or_public |
| POST | `/change_key_deals` | change_key_deals | auth_or_public |
| POST | `/checked_opportunity` | checkedOpportunity | auth_or_public |
| POST | `/opportunity_teams` | opportunityTeamSave | auth_or_public |
| POST | `/departure_details` | departureDetails | auth_or_public |
| POST | `/departure_hold` | departureHolds | auth_or_public |
| POST | `/departure_hold_book` | departureHoldBook | auth_or_public |
| POST | `/agent_departures` | agentDepartures | auth_or_public |
| POST | `/departure_book` | departureBook | auth_or_public |
| POST | `/send_rfq` | sendRfq | auth_or_public |
| GET | `/rest_oppportunities_s_emails` | searchEmail | auth_or_public |
| GET | `/show_opp_det/{id}` | show_opp_det | auth_or_public |
| POST | `/save_voucher/{id}` | saveVoucher | auth_or_public |
| POST | `/update_voucher/{id}` | updateVoucher | auth_or_public |
| GET | `/generate_voucher/{id}` | genVoucher | auth_or_public |
| GET | `/delete_voucher/{id}` | deleteVoucher | auth_or_public |
| POST | `/rest_opportunity_histories_import` | importHistoryMapPost | auth_or_public |
| POST | `/rest_opportunities_sales_stages` | PostSalesStage | auth_or_public |
| POST | `/user_opportunity_unlock` | oppoUnlock | auth_or_public |
| GET | `/agent_departure_booked/{id}` | agentDepartureBooked | auth_or_public |
| PATCH | `/rest_opportunities/{id}` | update | auth_or_public:resource |

### RestOpportunityMobileController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_opportunities_sales_stages_m` | PostSalesStage | auth_or_public |
| PATCH | `/rest_opportunities_m/{id}` | update | auth_or_public:resource |

### RestOpportunityTagController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/sort_opportunity_tags_fields` | sort_fields | admin |
| PATCH | `/rest_opportunity_tags/{id}` | update | auth_or_public:resource |

### RestPersonalAccountController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_personal_accounts_s_emails` | searchEmail | auth_or_public |
| PATCH | `/rest_personal_accounts/{id}` | update | auth_or_public:resource |

### RestPersonalAccountMobileController (4)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_personal_accounts_m` | store | auth_or_public:resource |
| PUT | `/rest_personal_accounts_m/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_personal_accounts_m/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_personal_accounts_m/{id}` | destroy | auth_or_public:resource |

### RestProfileController (10)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_profiles_update_password` | updatePassword | auth_or_public |
| POST | `/create_mail_setup` | smtpStore | auth_or_public |
| POST | `/rest_avatars/upload` | postProfileImage | auth_or_public |
| POST | `/rest_banners/upload` | postBannerImage | auth_or_public |
| GET | `/rest_profiles` | index | auth_or_public:resource |
| POST | `/rest_profiles` | store | auth_or_public:resource |
| GET | `/rest_profiles/{id}` | show | auth_or_public:resource |
| PUT | `/rest_profiles/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_profiles/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_profiles/{id}` | destroy | auth_or_public:resource |

### RestRatingController (8)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/sort_ratings_fields` | sort_fields | admin |
| POST | `/admin/sort_categories_fields` | sort_fields | admin |
| GET | `/rest_ratings` | index | auth_or_public:resource |
| POST | `/rest_ratings` | store | auth_or_public:resource |
| GET | `/rest_ratings/{id}` | show | auth_or_public:resource |
| PUT | `/rest_ratings/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_ratings/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_ratings/{id}` | destroy | auth_or_public:resource |

### RestRegionController (4)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/get_regions` | fetchRegions | admin |
| GET | `/admin/get_countries` | fetchCountries | admin |
| GET | `/admin/get_region_by_countries/{id}` | fetchRegionByCountries | admin |
| GET | `/admin/get_country_by_destinations/{id}` | fetchCountryByDestinations | admin |

### RestReportController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_reports/reportable_type` | reportFilter | auth_or_public |
| POST | `/report_clone` | report_clone | auth_or_public |
| PATCH | `/rest_reports/{id}` | update | auth_or_public:resource |

### RestReportPreviewController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_report_previews` | reportPreview | auth_or_public |

### RestRoleController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/admin/rest_roles/{id}` | update | admin:resource |

### RestRoleHierarchyController (8)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/rest_role_hierarchies_assign/{id}` | getAssignUser | admin |
| POST | `/admin/rest_role_hierarchies_assign` | postAssignUser | admin |
| GET | `/admin/rest_role_hierarchies` | index | admin:resource |
| POST | `/admin/rest_role_hierarchies` | store | admin:resource |
| GET | `/admin/rest_role_hierarchies/{id}` | show | admin:resource |
| PUT | `/admin/rest_role_hierarchies/{id}` | update | admin:resource |
| PATCH | `/admin/rest_role_hierarchies/{id}` | update | admin:resource |
| DELETE | `/admin/rest_role_hierarchies/{id}` | destroy | admin:resource |

### RestSalesStageController (5)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/sort_sales_stages_fields` | sort_fields | auth_or_public |
| POST | `/rest_sales_stages` | store | auth_or_public:resource |
| PUT | `/rest_sales_stages/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_sales_stages/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_sales_stages/{id}` | destroy | auth_or_public:resource |

### RestSalutationController (7)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/sort_salutations_fields` | sort_fields | admin |
| GET | `/rest_salutations` | index | auth_or_public:resource |
| POST | `/rest_salutations` | store | auth_or_public:resource |
| GET | `/rest_salutations/{id}` | show | auth_or_public:resource |
| PUT | `/rest_salutations/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_salutations/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_salutations/{id}` | destroy | auth_or_public:resource |

### RestSearchModuleController (4)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/rest_supplier_template` | postSupplierTemplate | admin |
| POST | `/admin/rest_supplier_template_update` | updateSupplierTemplate | admin |
| POST | `/admin/rest_supplier_template_delete` | deleteSupplierTemplate | admin |
| GET | `/admin/get_supplier_template` | getSupplierEmailTemplate | admin |

### RestShareController (5)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_share_files_new` | sharedWithMe | auth_or_public |
| POST | `/rest_share_folder` | shareFolder | auth_or_public |
| POST | `/rest_share_files` | store | auth_or_public:resource |
| PUT | `/rest_share_files/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_share_files/{id}` | update | auth_or_public:resource |

### RestSourceController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_source` | index | auth_or_public:resource |
| POST | `/rest_source` | store | auth_or_public:resource |
| GET | `/rest_source/{id}` | show | auth_or_public:resource |
| PUT | `/rest_source/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_source/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_source/{id}` | destroy | auth_or_public:resource |

### RestSourceMediumController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_source_medium` | index | auth_or_public:resource |
| POST | `/rest_source_medium` | store | auth_or_public:resource |
| GET | `/rest_source_medium/{id}` | show | auth_or_public:resource |
| PUT | `/rest_source_medium/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_source_medium/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_source_medium/{id}` | destroy | auth_or_public:resource |

### RestStandardReportController (10)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_st_report` | standardReportUpdate | auth_or_public |
| POST | `/user_st_report` | userStandardReportUpdate | auth_or_public |
| POST | `/user_st_report_oppo` | usersStandardReportUpdate | auth_or_public |
| POST | `/user_st_report_oppo_d_i` | opportunityDomesInter | auth_or_public |
| POST | `/user_st_report_oppo_d_i_pipeline` | opportunityDomesInterParts | auth_or_public |
| POST | `/user_st_report_oppo_country` | opportunityCountry | auth_or_public |
| POST | `/active_user_report` | activeUserReport | auth_or_public |
| POST | `/account_contact_report` | accountContactReport | auth_or_public |
| POST | `/report_lead_conversion` | leadConversionReport | auth_or_public |
| POST | `/agent_departure_report` | agentDepartureReport | auth_or_public |

### RestSupplierController (8)

| Method | Path | Action | Group |
|---|---|---|---|
| PUT | `/rest_supplier/update/{id}` | update | auth_or_public |
| GET | `/rest_supplier_address/{id}` | addressToContact | auth_or_public |
| GET | `/rest_supplier` | index | auth_or_public:resource |
| POST | `/rest_supplier` | store | auth_or_public:resource |
| GET | `/rest_supplier/{id}` | show | auth_or_public:resource |
| PUT | `/rest_supplier/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_supplier/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_supplier/{id}` | destroy | auth_or_public:resource |

### RestSupplierPicklistRatingController (7)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/sort_supplier_rating_fields` | sort_fields | admin |
| GET | `/admin/supplier_rest_ratings` | index | admin:resource |
| POST | `/admin/supplier_rest_ratings` | store | admin:resource |
| GET | `/admin/supplier_rest_ratings/{id}` | show | admin:resource |
| PUT | `/admin/supplier_rest_ratings/{id}` | update | admin:resource |
| PATCH | `/admin/supplier_rest_ratings/{id}` | update | admin:resource |
| DELETE | `/admin/supplier_rest_ratings/{id}` | destroy | admin:resource |

### RestTaskController (4)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/all_notification` | all_notifications | auth_or_public |
| GET | `/get_all_notification` | get_all_notification | auth_or_public |
| GET | `/rest_follow_up_tasks/{rest_task}` | followUpTasks | auth_or_public |
| PATCH | `/rest_tasks/{id}` | update | auth_or_public:resource |

### RestTaskPriorityController (7)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/sort_task_priorities_fields` | sort_fields | admin |
| GET | `/rest_task_priorities` | index | auth_or_public:resource |
| POST | `/rest_task_priorities` | store | auth_or_public:resource |
| GET | `/rest_task_priorities/{id}` | show | auth_or_public:resource |
| PUT | `/rest_task_priorities/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_task_priorities/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_task_priorities/{id}` | destroy | auth_or_public:resource |

### RestTaskStatusController (7)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/sort_task_statuses_fields` | sort_fields | auth_or_public |
| GET | `/rest_task_statuses` | index | auth_or_public:resource |
| POST | `/rest_task_statuses` | store | auth_or_public:resource |
| GET | `/rest_task_statuses/{id}` | show | auth_or_public:resource |
| PUT | `/rest_task_statuses/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_task_statuses/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_task_statuses/{id}` | destroy | auth_or_public:resource |

### RestTerritoryController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/get_destinations` | getDestination | admin |
| PATCH | `/admin/rest_territories/{id}` | update | admin:resource |

### RestTimeZoneController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_itinerary_timezones` | timezones | auth_or_public |

### RestUserController (11)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/users_sales_target` | usersSalesTarget | admin |
| POST | `/admin/updateCurrentTarget` | updateCurrentTarget | admin |
| POST | `/admin/updateUserTargets` | updateUserTargets | admin |
| POST | `/admin/updateUserTargetsEdit` | updateUserTargetsEdit | admin |
| POST | `/admin/updateAllUserTargets` | updateAllUserTargets | admin |
| POST | `/admin/send_reset_pswd` | sendResetEmail | admin |
| POST | `/admin/update_user_sales_org` | update_user_sales_org | admin |
| PATCH | `/admin/rest_users/{id}` | update | admin:resource |
| POST | `/rest_auto_users_store` | autoAssignUsersStore | auth_or_public |
| PUT | `/rest_auto_users_update/{id}` | autoAssignUsersUpdate | auth_or_public |
| DELETE | `/rest_auto_users_delete/{id}` | autoAssignUsersDestroy | auth_or_public |

### RestsupplierServicesPicklistController (7)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/sort_supplier_service_fields` | sort_fields | admin |
| GET | `/admin/supplier_rest_services` | index | admin:resource |
| POST | `/admin/supplier_rest_services` | store | admin:resource |
| GET | `/admin/supplier_rest_services/{id}` | show | admin:resource |
| PUT | `/admin/supplier_rest_services/{id}` | update | admin:resource |
| PATCH | `/admin/supplier_rest_services/{id}` | update | admin:resource |
| DELETE | `/admin/supplier_rest_services/{id}` | destroy | admin:resource |

### RestsuppliertypePicklistController (7)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/sort_supplier_type_fields` | sort_fields | admin |
| GET | `/admin/supplier_rest_types` | index | admin:resource |
| POST | `/admin/supplier_rest_types` | store | admin:resource |
| GET | `/admin/supplier_rest_types/{id}` | show | admin:resource |
| PUT | `/admin/supplier_rest_types/{id}` | update | admin:resource |
| PATCH | `/admin/supplier_rest_types/{id}` | update | admin:resource |
| DELETE | `/admin/supplier_rest_types/{id}` | destroy | admin:resource |

### ScheduleItemController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_itinerary_schedule_new` | index | auth_or_public:resource |
| POST | `/rest_itinerary_schedule_new` | store | auth_or_public:resource |
| GET | `/rest_itinerary_schedule_new/{id}` | show | auth_or_public:resource |
| PUT | `/rest_itinerary_schedule_new/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_itinerary_schedule_new/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_itinerary_schedule_new/{id}` | destroy | auth_or_public:resource |

### SchedulerSettingController (8)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/admin/store-user-wise-assignment-settings` | storeUserWiseAssignmentSettings | admin |
| GET | `/admin/get-user-wise-assignment-settings` | getUserWiseAssignmentSettings | admin |
| POST | `/admin/update-user-wise-assignment-settings` | updateUserWiseAssignmentSettings | admin |
| POST | `/admin/delete-user-wise-assignment-settings` | deleteUserWiseAssignmentSettings | admin |
| GET | `/admin/get-country-wise-user` | getCountryWiseUser | admin |
| POST | `/admin/store-country-wise-user` | storeCountryWiseUser | admin |
| POST | `/admin/delete-country-wise-user` | deleteCountryWiseUser | admin |
| POST | `/admin/update-country-wise-user` | updateCountryWiseUser | admin |

### StandardFieldAccountController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/edit_account_standard_fields/{id}` | editAccountStandardField | admin |
| POST | `/admin/update_account_standard_fields/{id}` | updateAccountStandardField | admin |
| POST | `/sort_accounts_st_fields` | sort_fields | auth_or_public |

### StandardFieldContactController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/edit_contact_standard_fields/{id}` | editContactStandardField | admin |
| POST | `/admin/update_contact_standard_fields/{id}` | updateContactStandardField | admin |
| POST | `/sort_contacts_st_fields` | sort_fields | auth_or_public |

### StandardFieldLeadController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/edit_lead_standard_fields/{id}` | editLeadStandardField | admin |
| POST | `/admin/update_lead_standard_fields/{id}` | updateLeadStandardField | admin |
| POST | `/sort_leads_st_fields` | sort_fields | auth_or_public |

### StandardFieldOpportunityController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/edit_opp_standard_fields/{id}` | editOppStandardField | admin |
| POST | `/admin/update_opp_standard_fields/{id}` | updateOppStandardField | admin |
| POST | `/sort_opportunities_st_fields` | sort_fields | auth_or_public |

### StandardFieldPersonalAccountController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/rest_standard_fields_personal_account_admin` | restStandardFieldsPersonalAccountAdmin | admin |
| GET | `/admin/edit_personal_account_standard_fields/{id}` | editPersonalAccountStandardField | admin |
| POST | `/admin/update_personal_account_standard_fields/{id}` | updatePersonalAccountStandardField | admin |
| POST | `/admin/update_personal_account_standard_fields_status/{id}` | updatePersonalAccountStandardFieldActivationStatus | admin |
| POST | `/admin/update_personal_account_standard_fields_mandatory/{id}` | updatePersonalAccountStandardFieldMandatory | admin |
| POST | `/sort_personal_accounts_st_fields` | sort_fields | auth_or_public |

### StandardFieldSupplierController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/sort_accounts_st_fields` | sort_fields | auth_or_public |

### SupplierColumnController (6)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_supplier_columns` | index | auth_or_public:resource |
| POST | `/rest_supplier_columns` | store | auth_or_public:resource |
| GET | `/rest_supplier_columns/{id}` | show | auth_or_public:resource |
| PUT | `/rest_supplier_columns/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_supplier_columns/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_supplier_columns/{id}` | destroy | auth_or_public:resource |

### SupplierViewController (8)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/rest_supplier_filters` | postFilter | auth_or_public |
| PATCH | `/rest_suppliers_views/{id}` | update | auth_or_public:resource |
| GET | `/rest_supplier_views` | index | auth_or_public:resource |
| POST | `/rest_supplier_views` | store | auth_or_public:resource |
| GET | `/rest_supplier_views/{id}` | show | auth_or_public:resource |
| PUT | `/rest_supplier_views/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_supplier_views/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_supplier_views/{id}` | destroy | auth_or_public:resource |

### TaskColumnController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/rest_tasks_columns/{id}` | update | auth_or_public:resource |

### TaskViewController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| PATCH | `/rest_tasks_views/{id}` | update | auth_or_public:resource |

### TourItineraryController (9)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/get_tour_create` | createData | auth_or_public |
| GET | `/get_tour_name` | getTourNames | auth_or_public |
| POST | `/copyTourItinerary` | copyTourItinerary | auth_or_public |
| POST | `/add_inclision_exclusion_tour` | addInclisionExclusion | auth_or_public |
| POST | `/add_itinerary_setting_tour` | addItinerarySettings | auth_or_public |
| POST | `/send_itinerary_email_tour` | send_itinerary_email | auth_or_public |
| GET | `/get_itineraries_price/{id}` | getItineraryPrice | auth_or_public |
| POST | `/update_itineraries_price/{id}` | updateItineraryPrice | auth_or_public |
| PATCH | `/rest_itineraries_tour/{id}` | update | auth_or_public:resource |

### TourItineraryFlightController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/search_flight_tour` | search_flights | auth_or_public |

### TourItineraryHotelController (7)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/search_hotel_tour` | search_hotel | auth_or_public |
| GET | `/rest_itinerary_hotels_tour` | index | auth_or_public:resource |
| POST | `/rest_itinerary_hotels_tour` | store | auth_or_public:resource |
| GET | `/rest_itinerary_hotels_tour/{id}` | show | auth_or_public:resource |
| PUT | `/rest_itinerary_hotels_tour/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_itinerary_hotels_tour/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_itinerary_hotels_tour/{id}` | destroy | auth_or_public:resource |

### TourScheduleItemController (7)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/updateTransfer` | updateTransfer | auth_or_public |
| GET | `/rest_itinerary_schedule_tour` | index | auth_or_public:resource |
| POST | `/rest_itinerary_schedule_tour` | store | auth_or_public:resource |
| GET | `/rest_itinerary_schedule_tour/{id}` | show | auth_or_public:resource |
| PUT | `/rest_itinerary_schedule_tour/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_itinerary_schedule_tour/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_itinerary_schedule_tour/{id}` | destroy | auth_or_public:resource |

### UserItineraryInclusionController (3)

| Method | Path | Action | Group |
|---|---|---|---|
| PUT | `/rest_user_itinerary_inclusions/{id}` | update | auth_or_public:resource |
| PATCH | `/rest_user_itinerary_inclusions/{id}` | update | auth_or_public:resource |
| DELETE | `/rest_user_itinerary_inclusions/{id}` | destroy | auth_or_public:resource |

### UserReportController (2)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/admin/get_user_report` | userReport | admin |
| GET | `/get_user_report_performance` | userReport | auth_or_public |

### sampleFileController (1)

| Method | Path | Action | Group |
|---|---|---|---|
| GET | `/rest_sample_download/{type}` | downlaodSample | auth_or_public |

### subscriptionController (9)

| Method | Path | Action | Group |
|---|---|---|---|
| POST | `/create-product` | CreateProduct | auth_or_public |
| POST | `/create-plan-byproductid` | CreatePlanByProductId | auth_or_public |
| POST | `/create-user` | Createuser | auth_or_public |
| POST | `/create-customer-with-subscription` | CreateCustomerwithSubsccription | auth_or_public |
| GET | `/get-product-list` | ProductList | auth_or_public |
| POST | `/getUserCheckoutDetail` | getcheckoutUserDetail | auth_or_public |
| GET | `/get-product` | getproduct | auth_or_public |
| POST | `/get-plans` | getplanBYproductid | auth_or_public |
| POST | `/get-single-plan` | getsingleplan | auth_or_public |

## Fuzzy matches (likely covered, verify response shape)

| Old method | Old path | Match |
|---|---|---|
| GET | `/admin/get_agent` | fuzzy:0.50->GET /api/v1/admin/agent-connect |
| POST | `/admin/agent_connect` | fuzzy:1.00->POST /api/v1/admin/agent-connect |
| GET | `/admin/opp_settings` | fuzzy:1.00->GET /api/v1/admin/opp-settings |
| POST | `/admin/opp_settings_change` | fuzzy:0.75->POST /api/v1/admin/opp-settings |
| POST | `/admin/rest_users_deactivate` | fuzzy:0.67->POST /api/v1/users/{user_id}/deactivate |
| POST | `/admin/rest_users_reactivate` | fuzzy:0.67->POST /api/v1/users/{user_id}/reactivate |
| GET | `/admin/rest_bd_users` | fuzzy:0.67->GET /api/v1/users/bd |
| GET | `/admin/rest_standard_fields_opp_admin` | fuzzy:0.50->GET /api/v1/standard_fields/{entity_type} |
| POST | `/admin/update_opp_standard_fields_status/{id}` | fuzzy:0.50->POST /api/v1/standard_fields/{entity_type}/status |
| POST | `/admin/update_opp_standard_fields_mandatory/{id}` | fuzzy:0.50->POST /api/v1/standard_fields/{entity_type}/mandatory |
| GET | `/admin/rest_standard_fields_account_admin` | fuzzy:0.50->GET /api/v1/standard_fields/{entity_type} |
| POST | `/admin/update_account_standard_fields_status/{id}` | fuzzy:0.50->POST /api/v1/standard_fields/{entity_type}/status |
| POST | `/admin/update_account_standard_fields_mandatory/{id}` | fuzzy:0.50->POST /api/v1/standard_fields/{entity_type}/mandatory |
| GET | `/admin/rest_standard_fields_contact_admin` | fuzzy:0.50->GET /api/v1/standard_fields/{entity_type} |
| POST | `/admin/update_contact_standard_fields_status/{id}` | fuzzy:0.50->POST /api/v1/standard_fields/{entity_type}/status |
| POST | `/admin/update_contact_standard_fields_mandatory/{id}` | fuzzy:0.50->POST /api/v1/standard_fields/{entity_type}/mandatory |
| GET | `/admin/rest_standard_fields_lead_admin` | fuzzy:0.50->GET /api/v1/standard_fields/{entity_type} |
| POST | `/admin/update_lead_standard_fields_status/{id}` | fuzzy:0.50->POST /api/v1/standard_fields/{entity_type}/status |
| POST | `/admin/update_lead_standard_fields_mandatory/{id}` | fuzzy:0.50->POST /api/v1/standard_fields/{entity_type}/mandatory |
| GET | `/admin/get-auto-assignment-setting` | fuzzy:0.60->GET /api/v1/admin/auto-assignment |
| POST | `/admin/store-auto-assignment-settings` | fuzzy:0.60->POST /api/v1/admin/auto-assignment |
| GET | `/admin/department_settings` | fuzzy:1.00->GET /api/v1/admin/department-settings |
| POST | `/admin/department_settings` | fuzzy:1.00->POST /api/v1/admin/department-settings |
| GET | `/admin/department_incentives` | fuzzy:1.00->GET /api/v1/admin/department-incentives |
| POST | `/admin/department_incentives_by_month` | fuzzy:1.00->POST /api/v1/admin/department-incentives/by-month |
| GET | `/admin/department_users/{id}` | fuzzy:0.75->GET /api/v1/admin/department-settings/{department_id}/users |
| POST | `/admin/department_users` | fuzzy:0.50->POST /api/v1/admin/department-settings |
| GET | `/admin/rest_company_settings` | fuzzy:0.67->GET /api/v1/admin/company |
| POST | `/admin/rest_company_settings` | fuzzy:0.50->POST /api/v1/admin/opp-settings |
| GET | `/admin/rest_company_settings/{id}` | fuzzy:0.67->GET /api/v1/admin/company |
| PUT | `/admin/rest_company_settings/{id}` | fuzzy:0.67->PUT /api/v1/admin/company |
| GET | `/admin/rest_users` | fuzzy:0.50->GET /api/v1/admin/auto-assignment/users |
| POST | `/admin/rest_users` | fuzzy:0.50->POST /api/v1/admin/auto-assignment/users |
| GET | `/admin/rest_users/{id}` | fuzzy:0.50->GET /api/v1/admin/auto-assignment/users |
| PUT | `/admin/rest_users/{id}` | fuzzy:0.50->PUT /api/v1/admin/auto-assignment/users/{user_id} |
| DELETE | `/admin/rest_users/{id}` | fuzzy:0.50->DELETE /api/v1/admin/auto-assignment/users/{user_id} |
| GET | `/admin/rest_roles` | fuzzy:0.50->GET /api/v1/roles |
| POST | `/admin/rest_roles` | fuzzy:0.50->POST /api/v1/roles |
| GET | `/admin/rest_roles/{id}` | fuzzy:0.50->GET /api/v1/roles |
| PUT | `/admin/rest_roles/{id}` | fuzzy:0.50->PUT /api/v1/roles/{role_id} |
| DELETE | `/admin/rest_roles/{id}` | fuzzy:0.50->DELETE /api/v1/roles/{role_id} |
| GET | `/admin/rest_territories` | fuzzy:0.50->GET /api/v1/territories/territories |
| POST | `/admin/rest_territories` | fuzzy:0.50->POST /api/v1/territories/territories |
| GET | `/admin/rest_territories/{id}` | fuzzy:0.50->GET /api/v1/territories/territories |
| PUT | `/admin/rest_territories/{id}` | fuzzy:0.50->PUT /api/v1/territories/territories/{territory_id} |
| DELETE | `/admin/rest_territories/{id}` | fuzzy:0.50->DELETE /api/v1/territories/territories/{territory_id} |
| GET | `/admin/incentive_department` | fuzzy:0.50->GET /api/v1/admin/department-settings |
| POST | `/admin/incentive_department` | fuzzy:0.50->POST /api/v1/admin/department-settings |
| GET | `/admin/incentive_department/{id}` | fuzzy:0.50->GET /api/v1/admin/department-settings |
| GET | `/ai_email_report` | fuzzy:0.75->GET /api/v1/misc/ai-email-report |
| GET | `/check_tenant_activity` | fuzzy:0.75->GET /api/v1/misc/check-tenant-activity |
| POST | `/login` | fuzzy:0.50->POST /auth/login |
| POST | `/access_login` | fuzzy:0.67->POST /api/v1/misc/access-login |
| GET | `/rest_files_preview/{id}` | fuzzy:1.00->GET /api/v1/files/{file_id}/preview |
| GET | `/rest_files_public_url/{encrypted_id}` | fuzzy:0.67->GET /api/v1/files/{file_id}/url |
| POST | `/verify/normal_email/resend` | fuzzy:0.60->POST /api/v1/misc/verify-email/resend |
| GET | `/get-whatsapp-messages` | fuzzy:0.50->GET /api/v1/messaging/whatsapp/messages |
| POST | `/get_facebook_token` | fuzzy:0.50->POST /api/v1/misc/facebook/token |
| GET | `/get_tenant_user_details` | fuzzy:0.80->GET /api/v1/misc/get-tenant-user-details |
| GET | `/php_info` | fuzzy:0.67->GET /api/v1/misc/php-info |
| GET | `/v1/suppliers` | fuzzy:0.50->GET /api/v1/suppliers |
| GET | `/v1/sales_stages` | fuzzy:0.50->GET /api/v1/opportunities/sales-stages |
| GET | `/v1/users` | fuzzy:0.50->GET /api/v1/users |
| GET | `/v1/destinations` | fuzzy:0.50->GET /api/v1/destinations |
| GET | `/v1/countries` | fuzzy:0.50->GET /api/v1/countries |
| GET | `/v1/opportunities` | fuzzy:0.50->GET /api/v1/opportunities |
| GET | `/countries_opportunities_updated` | fuzzy:0.50->GET /api/v1/dashboards/countries-updated |
| GET | `/exp_opp` | fuzzy:0.67->GET /api/v1/dashboards/exp-opp |
| GET | `/exp_opp_state` | fuzzy:0.75->GET /api/v1/dashboards/exp-opp-state |
| GET | `/view_notification` | fuzzy:0.67->GET /api/v1/fcm/view-notification |
| GET | `/check_notification` | fuzzy:0.67->GET /api/v1/fcm/check-notification |
| GET | `/search_country` | fuzzy:0.67->GET /api/v1/misc/search-country |
| GET | `/logout` | fuzzy:0.50->GET /api/v1/misc/logout |
| GET | `/rest_user_activities` | fuzzy:0.67->GET /api/v1/dashboards/user-activities |
| GET | `/rest_dashboard` | fuzzy:0.50->GET /api/v1/mobile/dashboard |
| POST | `/save_quick_links` | fuzzy:0.50->POST /api/v1/dashboards/quick-links |
| POST | `/delete_quick_links` | fuzzy:0.50->POST /api/v1/dashboards/quick-links |
| GET | `/get_bd_dashboard_today_revenue` | fuzzy:0.50->GET /api/v1/dashboards/bd/today-revenue |
| GET | `/get_bd_opp_graph_performance` | fuzzy:0.50->GET /api/v1/dashboards/bd/graph-performance |
| GET | `/stage_percentage` | fuzzy:0.50->GET /api/v1/dashboards/bd/stage-percentage |
| GET | `/get_bd_stage_oppo_percentage` | fuzzy:0.50->GET /api/v1/dashboards/bd/stage-percentage |
| GET | `/team_performance` | fuzzy:0.67->GET /api/v1/dashboards/team-performance |
| GET | `/directory_check` | fuzzy:0.67->GET /api/v1/users/directory/check |
| GET | `/login_logs` | fuzzy:0.67->GET /api/v1/users/login-logs |
| POST | `/rest_monthly_performance` | fuzzy:0.67->POST /api/v1/dashboards/monthly-performance |
| GET | `/rest_search_modules` | fuzzy:0.67->GET /api/v1/search_extras/modules |
| POST | `/rest_search_modules_post` | fuzzy:0.50->POST /api/v1/search_extras/modules |
| GET | `/operators` | fuzzy:0.50->GET /api/v1/misc/operators |
| GET | `/rest_accounts_search` | fuzzy:1.00->GET /api/v1/accounts/search |
| GET | `/rest_accounts_address/{id}` | fuzzy:0.50->GET /api/v1/accounts |
| POST | `/rest_accounts/search` | fuzzy:0.50->POST /api/v1/accounts |
| POST | `/rest_accounts/single_column` | fuzzy:1.00->POST /api/v1/accounts/single-column |
| GET | `/rest_merge_accounts_search` | fuzzy:0.67->GET /api/v1/accounts/search |
| GET | `/rest_supplier_search` | fuzzy:0.50->GET /api/v1/search |
| POST | `/rest_supplier/search` | fuzzy:0.50->POST /api/v1/search_extras/supplier-templates |
| POST | `/rest_supplier/single_column` | fuzzy:0.50->POST /api/v1/accounts/single-column |
| GET | `/rest_standard_fields_account` | fuzzy:0.67->GET /api/v1/standard_fields/{entity_type} |
| GET | `/rest_standard_fields_account_admin` | fuzzy:0.50->GET /api/v1/standard_fields/{entity_type} |
| GET | `/edit_account_standard_fields/{id}` | fuzzy:0.50->GET /api/v1/standard_fields/{entity_type} |
| POST | `/update_account_standard_fields/{id}` | fuzzy:0.50->POST /api/v1/standard_fields/{entity_type} |
| POST | `/update_account_standard_fields_status/{id}` | fuzzy:0.60->POST /api/v1/standard_fields/{entity_type}/status |
| POST | `/update_account_standard_fields_mandatory/{id}` | fuzzy:0.60->POST /api/v1/standard_fields/{entity_type}/mandatory |
| POST | `/rest_accounts_change_owner` | fuzzy:1.00->POST /api/v1/accounts/{account_id}/change-owner |
| POST | `/rest_contacts_change_owner` | fuzzy:1.00->POST /api/v1/contacts/{contact_id}/change-owner |
| POST | `/rest_personal_accounts_change_owner` | fuzzy:0.75->POST /api/v1/accounts/{account_id}/change-owner |
| POST | `/rest_suppliers_change_owner` | fuzzy:0.50->POST /api/v1/accounts/{account_id}/change-owner |
| POST | `/rest_leads_change_owner` | fuzzy:1.00->POST /api/v1/leads/{lead_id}/change-owner |
| POST | `/rest_leads_delete_multiple` | fuzzy:0.50->POST /api/v1/leads/bulk-delete |
| POST | `/rest_leads_change_owner_multiple` | fuzzy:0.75->POST /api/v1/leads/{lead_id}/change-owner |
| GET | `/rest_users` | fuzzy:1.00->GET /api/v1/users |
| POST | `/rest_contacts_filters` | fuzzy:0.50->POST /api/v1/contacts |
| GET | `/rest_tasks/sort/{type}` | fuzzy:0.50->GET /api/v1/tasks |
| POST | `/rest_tasks_contacts` | fuzzy:0.50->POST /api/v1/contacts |
| POST | `/rest_tasks/single_column` | fuzzy:0.50->POST /api/v1/accounts/single-column |
| POST | `/rest_leads/single_column` | fuzzy:1.00->POST /api/v1/leads/single-column |
| GET | `/rest_leads_status` | fuzzy:0.50->GET /api/v1/leads |
| POST | `/rest_leads_status` | fuzzy:0.50->POST /api/v1/leads |
| POST | `/rest_leads_filters` | fuzzy:0.50->POST /api/v1/leads |
| GET | `/rest_leads/convert/{id}` | fuzzy:0.50->GET /api/v1/leads |
| POST | `/rest_leads/convert` | fuzzy:1.00->POST /api/v1/leads/{lead_id}/convert |
| POST | `/rest_leads/convertToOpportunities` | fuzzy:0.50->POST /api/v1/leads |
| POST | `/rest_email_image` | fuzzy:0.50->POST /api/v1/messaging/email/image-upload |
| POST | `/rest_email_image_editor` | fuzzy:0.75->POST /api/v1/messaging/email/image-editor |
| POST | `/opportunities_shifed` | fuzzy:0.50->POST /api/v1/opportunities |
| GET | `/rest_opportunities_support` | fuzzy:0.50->GET /api/v1/opportunities |
| POST | `/opportunities_inclusions/{id}` | fuzzy:0.50->POST /api/v1/opportunities |
| POST | `/operation_owner_change` | fuzzy:0.50->POST /api/v1/accounts/{account_id}/change-owner |
| POST | `/rest_itineraries_copy` | fuzzy:1.00->POST /api/v1/itineraries/{itinerary_id}/copy |
| GET | `/itinerary_flights_details_tour/{id}` | fuzzy:0.60->GET /api/v1/itineraries/tour/{tour_id}/flights/details |
| POST | `/rest_opportunities_contacts` | fuzzy:0.50->POST /api/v1/contacts |
| GET | `/rest_contacts_search` | fuzzy:1.00->GET /api/v1/contacts/search |
| GET | `/rest_personal_accounts_search` | fuzzy:0.67->GET /api/v1/accounts/search |
| GET | `/rest_personal_accounts_dynamic/{id}` | fuzzy:0.50->GET /api/v1/mobile/personal-accounts |
| POST | `/rest_tasks_filters` | fuzzy:0.50->POST /api/v1/tasks |
| GET | `/rest_files_new` | fuzzy:0.50->GET /api/v1/files |
| GET | `/rest_files_download/{id}` | fuzzy:1.00->GET /api/v1/files/{file_id}/download |
| GET | `/recent_files_all` | fuzzy:0.67->GET /api/v1/files/recent |
| GET | `/rest_files_display/{encrypted_id}` | fuzzy:0.50->GET /api/v1/files |
| GET | `/rest_shared_files_by_admin` | fuzzy:0.60->GET /api/v1/files/shares/by-admin |
| GET | `/rest_shared_files_by_admin_new` | fuzzy:0.50->GET /api/v1/files/shares/by-admin |
| GET | `/rest_files_public_link/{id}` | fuzzy:1.00->GET /api/v1/files/{file_id}/public-link |
| GET | `/rest_files_public_url/{encrypted_id}` | fuzzy:0.67->GET /api/v1/files/{file_id}/url |
| POST | `/format_data_export` | fuzzy:0.50->POST /api/v1/reports/export/format |
| GET | `/search_itinerary` | fuzzy:0.50->GET /api/v1/search |
| POST | `/leads_report` | fuzzy:0.50->POST /api/v1/leads |
| GET | `/email_client_seen` | fuzzy:0.75->GET /api/v1/misc/email-client/seen |
| POST | `/get_lat_long` | fuzzy:0.50->POST /api/v1/misc/lat-long |
| GET | `/check_tenant_subscription` | fuzzy:0.50->GET /api/v1/subscription/check-exception |
| GET | `/rest_reports_created_by_me` | fuzzy:1.00->GET /api/v1/reports/created-by-me |
| GET | `/rest_private_reports` | fuzzy:1.00->GET /api/v1/reports/private |
| GET | `/rest_public_reports` | fuzzy:1.00->GET /api/v1/reports/public |
| GET | `/rest_folders_created_by_me` | fuzzy:0.80->GET /api/v1/reports/folders/created-by-me |
| GET | `/rest_user_activities_m` | fuzzy:0.50->GET /api/v1/dashboards/user-activities |
| GET | `/rest_accounts_search_m` | fuzzy:0.67->GET /api/v1/accounts/search |
| POST | `/rest_accounts_change_owner_m` | fuzzy:0.75->POST /api/v1/accounts/{account_id}/change-owner |
| POST | `/rest_contacts_change_owner_m` | fuzzy:0.75->POST /api/v1/contacts/{contact_id}/change-owner |
| POST | `/rest_opportunities_change_owner_m` | fuzzy:0.75->POST /api/v1/opportunities/{opportunity_id}/change-owner |
| POST | `/rest_leads_change_owner_m` | fuzzy:0.75->POST /api/v1/leads/{lead_id}/change-owner |
| GET | `/rest_conversations` | fuzzy:0.50->GET /api/v1/messaging/conversations |
| GET | `/rest_standard_fields_opp` | fuzzy:0.67->GET /api/v1/standard_fields/{entity_type} |
| GET | `/rest_standard_fields_account` | fuzzy:0.67->GET /api/v1/standard_fields/{entity_type} |
| GET | `/rest_standard_fields_contact` | fuzzy:0.67->GET /api/v1/standard_fields/{entity_type} |
| GET | `/rest_standard_fields_lead` | fuzzy:0.67->GET /api/v1/standard_fields/{entity_type} |
| GET | `/rest_standard_fields_personal_account` | fuzzy:0.50->GET /api/v1/standard_fields/{entity_type} |
| POST | `/image_to_b64` | fuzzy:0.60->POST /api/v1/itineraries/hotels/image-to-b64 |
| POST | `/sort_accounts_fields` | fuzzy:0.50->POST /api/v1/custom_fields/{entity_type}/sort |
| POST | `/sort_suppliers_fields` | fuzzy:0.50->POST /api/v1/custom_fields/{entity_type}/sort |
| POST | `/sort_leads_fields` | fuzzy:0.50->POST /api/v1/custom_fields/{entity_type}/sort |
| POST | `/setup_gmail` | fuzzy:0.67->POST /api/v1/messaging/gmail/setup |
| POST | `/remove_gmail` | fuzzy:0.67->POST /api/v1/messaging/gmail/remove |
| GET | `/user_plan_modules/{product_id}` | fuzzy:0.75->GET /api/v1/subscription/user-plan-modules/{product_id} |
| GET | `/rest_users_all` | fuzzy:1.00->GET /api/v1/users/all |
| GET | `/get-existing-users` | fuzzy:0.50->GET /api/v1/subscription/existing-users |
| POST | `/create-subscription-for-existing-user` | fuzzy:0.50->POST /api/v1/subscription/subscriptions/existing-user |
| GET | `/subscription_update` | fuzzy:0.67->GET /api/v1/subscription/subscriptions/update |
| GET | `/subscription_upgrade` | fuzzy:0.67->GET /api/v1/subscription/subscriptions/upgrade |
| POST | `/check-user-create` | fuzzy:0.50->POST /api/v1/subscription/check-user |
| GET | `/check-user-exception` | fuzzy:0.50->GET /api/v1/subscription/check-exception |
| POST | `/rest_opportunities_change_owner` | fuzzy:1.00->POST /api/v1/opportunities/{opportunity_id}/change-owner |
| GET | `/rest_oppo_search` | fuzzy:0.50->GET /api/v1/search |
| POST | `/sort_contacts_fields` | fuzzy:0.50->POST /api/v1/custom_fields/{entity_type}/sort |
| POST | `/sort_opportunities_fields` | fuzzy:0.50->POST /api/v1/custom_fields/{entity_type}/sort |
| GET | `/rest_itinerary_destinations` | fuzzy:0.50->GET /api/v1/destinations |
| POST | `/rest_itinerary_flights_modify` | fuzzy:0.50->POST /api/v1/itineraries/flights/{flight_id}/modify |
| GET | `/check_pdf_status` | fuzzy:0.75->GET /api/v1/misc/check-pdf-status |
| GET | `/itinerary_publish_html/{id}/{template_id}/{template_type_id}` | fuzzy:0.50->GET /api/v1/itineraries/{itinerary_id}/publish-html |
| GET | `/rest_accounts_list` | fuzzy:0.50->GET /api/v1/accounts |
| GET | `/rest_field_lists` | fuzzy:0.67->GET /api/v1/imports/field-lists |
| GET | `/rest_leads_export/{type}` | fuzzy:1.00->GET /api/v1/leads/export/{format} |
| POST | `/rest_leads_import` | fuzzy:1.00->POST /api/v1/leads/import |
| GET | `/rest_accounts_export/{type}` | fuzzy:0.67->GET /api/v1/accounts_extra/export/{format} |
| POST | `/rest_accounts_import` | fuzzy:0.67->POST /api/v1/accounts_extra/import |
| GET | `/rest_contacts_export/{type}` | fuzzy:1.00->GET /api/v1/contacts/export/{format} |
| POST | `/rest_contacts_import` | fuzzy:1.00->POST /api/v1/contacts/import |
| GET | `/rest_personal_accounts_export/{type}` | fuzzy:0.50->GET /api/v1/accounts_extra/export/{format} |
| POST | `/rest_personal_accounts_import` | fuzzy:0.50->POST /api/v1/accounts_extra/import |
| POST | `/rest_tasks_import` | fuzzy:0.50->POST /api/v1/tasks |
| POST | `/rest_opportunities_import` | fuzzy:0.50->POST /api/v1/opportunities |
| GET | `/get_all_users` | fuzzy:0.67->GET /api/v1/users/all |
| GET | `/get_all_active_users` | fuzzy:0.75->GET /api/v1/users/all-active |
| GET | `/rest_email_templates` | fuzzy:0.50->GET /api/v1/templates |
| GET | `/rest_shared_with_me_folders` | fuzzy:0.80->GET /api/v1/reports/folders/shared-with-me |
| POST | `/rest_share_folders` | fuzzy:0.67->POST /api/v1/reports/folders/{folder_id}/share |
| POST | `/rest_accounts_filters` | fuzzy:0.50->POST /api/v1/accounts |
| POST | `/rest_contacts/single_column` | fuzzy:1.00->POST /api/v1/contacts/single-column |
| POST | `/rest_opportunities/single_column` | fuzzy:0.50->POST /api/v1/accounts/single-column |
| GET | `/rest_opportunities_sales_stages` | fuzzy:1.00->GET /api/v1/opportunities/sales-stages |
| GET | `/rest_opportunities_experiences` | fuzzy:1.00->GET /api/v1/opportunities/experiences |
| POST | `/rest_opportunities_filters` | fuzzy:0.50->POST /api/v1/opportunities |
| POST | `/rest_personal_accounts/single_column` | fuzzy:0.75->POST /api/v1/accounts/single-column |
| POST | `/rest_notes_add` | fuzzy:0.50->POST /api/v1/notes |
| POST | `/rest_notes_get` | fuzzy:0.50->POST /api/v1/notes |
| GET | `/rest_auto_users` | fuzzy:0.67->GET /api/v1/users/auto-assign |
| GET | `/rest_auto_users_edit/{id}` | fuzzy:0.50->GET /api/v1/users/auto-assign |
| GET | `/rest_bd_report_list` | fuzzy:0.75->GET /api/v1/territories/bd-report-list |
| POST | `/rest_bd_report_list` | fuzzy:0.75->POST /api/v1/territories/bd-report-list |
| POST | `/team_reports` | fuzzy:0.67->POST /api/v1/reports/standard/team |
| POST | `/opportunities-claimed` | fuzzy:0.50->POST /api/v1/opportunities |
| POST | `/claimed-opportunities-reports` | fuzzy:0.50->POST /api/v1/reports/standard/opportunities |
| GET | `/rest_accounts_views` | fuzzy:0.50->GET /api/v1/accounts |
| POST | `/rest_accounts_views` | fuzzy:0.50->POST /api/v1/accounts |
| GET | `/rest_accounts_views/{id}` | fuzzy:0.50->GET /api/v1/accounts |
| PUT | `/rest_accounts_views/{id}` | fuzzy:0.50->PUT /api/v1/accounts/{account_id} |
| DELETE | `/rest_accounts_views/{id}` | fuzzy:0.50->DELETE /api/v1/accounts/{account_id} |
| GET | `/rest_suppliers_views` | fuzzy:0.50->GET /api/v1/suppliers |
| POST | `/rest_suppliers_views` | fuzzy:0.50->POST /api/v1/suppliers |
| GET | `/rest_suppliers_views/{id}` | fuzzy:0.50->GET /api/v1/suppliers |
| PUT | `/rest_suppliers_views/{id}` | fuzzy:0.50->PUT /api/v1/suppliers/{supplier_id} |
| DELETE | `/rest_suppliers_views/{id}` | fuzzy:0.50->DELETE /api/v1/suppliers/{supplier_id} |
| GET | `/rest_accounts_columns` | fuzzy:0.50->GET /api/v1/accounts |
| POST | `/rest_accounts_columns` | fuzzy:0.50->POST /api/v1/accounts |
| GET | `/rest_accounts_columns/{id}` | fuzzy:0.50->GET /api/v1/accounts |
| PUT | `/rest_accounts_columns/{id}` | fuzzy:0.50->PUT /api/v1/accounts/{account_id} |
| DELETE | `/rest_accounts_columns/{id}` | fuzzy:0.50->DELETE /api/v1/accounts/{account_id} |
| GET | `/rest_email_templates` | fuzzy:0.50->GET /api/v1/templates |
| POST | `/rest_email_templates` | fuzzy:0.50->POST /api/v1/templates |
| GET | `/rest_email_templates/{id}` | fuzzy:0.50->GET /api/v1/templates |
| PUT | `/rest_email_templates/{id}` | fuzzy:0.50->PUT /api/v1/templates/{template_id} |
| DELETE | `/rest_email_templates/{id}` | fuzzy:0.50->DELETE /api/v1/templates/{template_id} |
| GET | `/rest_accounts` | fuzzy:1.00->GET /api/v1/accounts |
| POST | `/rest_accounts` | fuzzy:1.00->POST /api/v1/accounts |
| GET | `/rest_accounts/{id}` | fuzzy:1.00->GET /api/v1/accounts |
| PUT | `/rest_accounts/{id}` | fuzzy:1.00->PUT /api/v1/accounts/{account_id} |
| DELETE | `/rest_accounts/{id}` | fuzzy:1.00->DELETE /api/v1/accounts/{account_id} |
| GET | `/rest_merge_accounts` | fuzzy:0.50->GET /api/v1/accounts |
| POST | `/rest_merge_accounts` | fuzzy:0.50->POST /api/v1/accounts |
| GET | `/rest_merge_accounts/{id}` | fuzzy:0.50->GET /api/v1/accounts |
| PUT | `/rest_merge_accounts/{id}` | fuzzy:0.50->PUT /api/v1/accounts/{account_id} |
| DELETE | `/rest_merge_accounts/{id}` | fuzzy:0.50->DELETE /api/v1/accounts/{account_id} |
| GET | `/rest_contacts` | fuzzy:1.00->GET /api/v1/contacts |
| POST | `/rest_contacts` | fuzzy:1.00->POST /api/v1/contacts |
| GET | `/rest_contacts/{id}` | fuzzy:1.00->GET /api/v1/contacts |
| PUT | `/rest_contacts/{id}` | fuzzy:1.00->PUT /api/v1/contacts/{contact_id} |
| DELETE | `/rest_contacts/{id}` | fuzzy:1.00->DELETE /api/v1/contacts/{contact_id} |
| GET | `/rest_contacts_views` | fuzzy:0.50->GET /api/v1/contacts |
| POST | `/rest_contacts_views` | fuzzy:0.50->POST /api/v1/contacts |
| GET | `/rest_contacts_views/{id}` | fuzzy:0.50->GET /api/v1/contacts |
| PUT | `/rest_contacts_views/{id}` | fuzzy:0.50->PUT /api/v1/contacts/{contact_id} |
| DELETE | `/rest_contacts_views/{id}` | fuzzy:0.50->DELETE /api/v1/contacts/{contact_id} |
| GET | `/rest_contacts_columns` | fuzzy:0.50->GET /api/v1/contacts |
| POST | `/rest_contacts_columns` | fuzzy:0.50->POST /api/v1/contacts |
| GET | `/rest_contacts_columns/{id}` | fuzzy:0.50->GET /api/v1/contacts |
| PUT | `/rest_contacts_columns/{id}` | fuzzy:0.50->PUT /api/v1/contacts/{contact_id} |
| DELETE | `/rest_contacts_columns/{id}` | fuzzy:0.50->DELETE /api/v1/contacts/{contact_id} |
| GET | `/rest_tasks` | fuzzy:1.00->GET /api/v1/tasks |
| POST | `/rest_tasks` | fuzzy:1.00->POST /api/v1/tasks |
| GET | `/rest_tasks/{id}` | fuzzy:1.00->GET /api/v1/tasks |
| PUT | `/rest_tasks/{id}` | fuzzy:1.00->PUT /api/v1/tasks/{task_id} |
| DELETE | `/rest_tasks/{id}` | fuzzy:1.00->DELETE /api/v1/tasks/{task_id} |
| GET | `/rest_tasks_columns` | fuzzy:0.50->GET /api/v1/tasks |
| POST | `/rest_tasks_columns` | fuzzy:0.50->POST /api/v1/tasks |
| GET | `/rest_tasks_columns/{id}` | fuzzy:0.50->GET /api/v1/tasks |
| PUT | `/rest_tasks_columns/{id}` | fuzzy:0.50->PUT /api/v1/tasks/{task_id} |
| DELETE | `/rest_tasks_columns/{id}` | fuzzy:0.50->DELETE /api/v1/tasks/{task_id} |
| GET | `/rest_personal_accounts` | fuzzy:0.67->GET /api/v1/mobile/personal-accounts |
| POST | `/rest_personal_accounts` | fuzzy:0.50->POST /api/v1/accounts |
| GET | `/rest_personal_accounts/{id}` | fuzzy:0.67->GET /api/v1/mobile/personal-accounts |
| PUT | `/rest_personal_accounts/{id}` | fuzzy:0.50->PUT /api/v1/accounts/{account_id} |
| DELETE | `/rest_personal_accounts/{id}` | fuzzy:0.50->DELETE /api/v1/accounts/{account_id} |
| GET | `/rest_bd_personal_accounts` | fuzzy:0.50->GET /api/v1/mobile/personal-accounts |
| GET | `/rest_bd_personal_accounts/{id}` | fuzzy:0.50->GET /api/v1/mobile/personal-accounts |
| GET | `/rest_personal_accounts_views` | fuzzy:0.50->GET /api/v1/mobile/personal-accounts |
| GET | `/rest_personal_accounts_views/{id}` | fuzzy:0.50->GET /api/v1/mobile/personal-accounts |
| GET | `/rest_personal_accounts_columns` | fuzzy:0.50->GET /api/v1/mobile/personal-accounts |
| GET | `/rest_personal_accounts_columns/{id}` | fuzzy:0.50->GET /api/v1/mobile/personal-accounts |
| GET | `/rest_leads` | fuzzy:1.00->GET /api/v1/leads |
| POST | `/rest_leads` | fuzzy:1.00->POST /api/v1/leads |
| GET | `/rest_leads/{id}` | fuzzy:1.00->GET /api/v1/leads |
| PUT | `/rest_leads/{id}` | fuzzy:1.00->PUT /api/v1/leads/{lead_id} |
| DELETE | `/rest_leads/{id}` | fuzzy:1.00->DELETE /api/v1/leads/{lead_id} |
| GET | `/rest_leads_views` | fuzzy:0.50->GET /api/v1/leads |
| POST | `/rest_leads_views` | fuzzy:0.50->POST /api/v1/leads |
| GET | `/rest_leads_views/{id}` | fuzzy:0.50->GET /api/v1/leads |
| PUT | `/rest_leads_views/{id}` | fuzzy:0.50->PUT /api/v1/leads/{lead_id} |
| DELETE | `/rest_leads_views/{id}` | fuzzy:0.50->DELETE /api/v1/leads/{lead_id} |
| GET | `/rest_leads_columns` | fuzzy:0.50->GET /api/v1/leads |
| POST | `/rest_leads_columns` | fuzzy:0.50->POST /api/v1/leads |
| GET | `/rest_leads_columns/{id}` | fuzzy:0.50->GET /api/v1/leads |
| PUT | `/rest_leads_columns/{id}` | fuzzy:0.50->PUT /api/v1/leads/{lead_id} |
| DELETE | `/rest_leads_columns/{id}` | fuzzy:0.50->DELETE /api/v1/leads/{lead_id} |
| GET | `/rest_emails` | fuzzy:1.00->GET /api/v1/emails/{email_id} |
| POST | `/rest_emails` | fuzzy:1.00->POST /api/v1/emails |
| GET | `/rest_emails/{id}` | fuzzy:1.00->GET /api/v1/emails/{email_id} |
| GET | `/rest_events` | fuzzy:1.00->GET /api/v1/events |
| POST | `/rest_events` | fuzzy:1.00->POST /api/v1/events |
| GET | `/rest_events/{id}` | fuzzy:1.00->GET /api/v1/events |
| PUT | `/rest_events/{id}` | fuzzy:1.00->PUT /api/v1/events/{event_id} |
| DELETE | `/rest_events/{id}` | fuzzy:1.00->DELETE /api/v1/events/{event_id} |
| GET | `/rest_opportunities_views` | fuzzy:0.50->GET /api/v1/opportunities |
| POST | `/rest_opportunities_views` | fuzzy:0.50->POST /api/v1/opportunities |
| GET | `/rest_opportunities_views/{id}` | fuzzy:0.50->GET /api/v1/opportunities |
| PUT | `/rest_opportunities_views/{id}` | fuzzy:0.50->PUT /api/v1/opportunities/{opportunity_id} |
| DELETE | `/rest_opportunities_views/{id}` | fuzzy:0.50->DELETE /api/v1/opportunities/{opportunity_id} |
| GET | `/rest_opportunities` | fuzzy:1.00->GET /api/v1/opportunities |
| POST | `/rest_opportunities` | fuzzy:1.00->POST /api/v1/opportunities |
| GET | `/rest_opportunities/{id}` | fuzzy:1.00->GET /api/v1/opportunities |
| PUT | `/rest_opportunities/{id}` | fuzzy:1.00->PUT /api/v1/opportunities/{opportunity_id} |
| DELETE | `/rest_opportunities/{id}` | fuzzy:1.00->DELETE /api/v1/opportunities/{opportunity_id} |
| GET | `/rest_bd_opportunities` | fuzzy:0.50->GET /api/v1/dashboards/bd/today-opportunities |
| POST | `/rest_bd_opportunities` | fuzzy:0.50->POST /api/v1/opportunities |
| GET | `/rest_bd_opportunities/{id}` | fuzzy:0.50->GET /api/v1/dashboards/bd/today-opportunities |
| PUT | `/rest_bd_opportunities/{id}` | fuzzy:0.50->PUT /api/v1/opportunities/{opportunity_id} |
| DELETE | `/rest_bd_opportunities/{id}` | fuzzy:0.50->DELETE /api/v1/opportunities/{opportunity_id} |
| GET | `/bd_opportunities` | fuzzy:0.50->GET /api/v1/dashboards/bd/today-opportunities |
| POST | `/bd_opportunities` | fuzzy:0.50->POST /api/v1/opportunities |
| GET | `/bd_opportunities/{id}` | fuzzy:0.50->GET /api/v1/dashboards/bd/today-opportunities |
| PUT | `/bd_opportunities/{id}` | fuzzy:0.50->PUT /api/v1/opportunities/{opportunity_id} |
| DELETE | `/bd_opportunities/{id}` | fuzzy:0.50->DELETE /api/v1/opportunities/{opportunity_id} |
| GET | `/rest_opportunities_columns` | fuzzy:0.50->GET /api/v1/opportunities |
| POST | `/rest_opportunities_columns` | fuzzy:0.50->POST /api/v1/opportunities |
| GET | `/rest_opportunities_columns/{id}` | fuzzy:0.50->GET /api/v1/opportunities |
| PUT | `/rest_opportunities_columns/{id}` | fuzzy:0.50->PUT /api/v1/opportunities/{opportunity_id} |
| DELETE | `/rest_opportunities_columns/{id}` | fuzzy:0.50->DELETE /api/v1/opportunities/{opportunity_id} |
| GET | `/rest_addfield_opportunities` | fuzzy:0.50->GET /api/v1/opportunities |
| POST | `/rest_addfield_opportunities` | fuzzy:0.50->POST /api/v1/opportunities |
| GET | `/rest_addfield_opportunities/{id}` | fuzzy:0.50->GET /api/v1/opportunities |
| PUT | `/rest_addfield_opportunities/{id}` | fuzzy:0.50->PUT /api/v1/opportunities/{opportunity_id} |
| DELETE | `/rest_addfield_opportunities/{id}` | fuzzy:0.50->DELETE /api/v1/opportunities/{opportunity_id} |
| GET | `/rest_itineraries_tour` | fuzzy:1.00->GET /api/v1/itineraries/tour |
| POST | `/rest_itineraries_tour` | fuzzy:1.00->POST /api/v1/itineraries/tour |
| GET | `/rest_itineraries_tour/{id}` | fuzzy:1.00->GET /api/v1/itineraries/tour |
| PUT | `/rest_itineraries_tour/{id}` | fuzzy:0.50->PUT /api/v1/itineraries/{itinerary_id} |
| DELETE | `/rest_itineraries_tour/{id}` | fuzzy:0.50->DELETE /api/v1/itineraries/{itinerary_id} |
| GET | `/rest_itineraries` | fuzzy:1.00->GET /api/v1/itineraries |
| POST | `/rest_itineraries` | fuzzy:1.00->POST /api/v1/itineraries |
| GET | `/rest_itineraries/{id}` | fuzzy:1.00->GET /api/v1/itineraries |
| PUT | `/rest_itineraries/{id}` | fuzzy:1.00->PUT /api/v1/itineraries/{itinerary_id} |
| DELETE | `/rest_itineraries/{id}` | fuzzy:1.00->DELETE /api/v1/itineraries/{itinerary_id} |
| GET | `/rest_itinerary_sub_categories` | fuzzy:0.50->GET /api/v1/itineraries/sub-categories |
| POST | `/rest_itinerary_sub_categories` | fuzzy:0.50->POST /api/v1/itineraries/sub-categories |
| GET | `/rest_itinerary_sub_categories/{id}` | fuzzy:0.50->GET /api/v1/itineraries/sub-categories |
| GET | `/rest_proforma_invoices` | fuzzy:0.50->GET /api/v1/invoices |
| POST | `/rest_proforma_invoices` | fuzzy:0.50->POST /api/v1/invoices |
| GET | `/rest_proforma_invoices/{id}` | fuzzy:0.50->GET /api/v1/invoices |
| PUT | `/rest_proforma_invoices/{id}` | fuzzy:0.50->PUT /api/v1/invoices/{invoice_id} |
| DELETE | `/rest_proforma_invoices/{id}` | fuzzy:0.50->DELETE /api/v1/invoices/{invoice_id} |
| GET | `/rest_tasks_views` | fuzzy:0.50->GET /api/v1/tasks |
| POST | `/rest_tasks_views` | fuzzy:0.50->POST /api/v1/tasks |
| GET | `/rest_tasks_views/{id}` | fuzzy:0.50->GET /api/v1/tasks |
| PUT | `/rest_tasks_views/{id}` | fuzzy:0.50->PUT /api/v1/tasks/{task_id} |
| DELETE | `/rest_tasks_views/{id}` | fuzzy:0.50->DELETE /api/v1/tasks/{task_id} |
| GET | `/rest_files` | fuzzy:1.00->GET /api/v1/files |
| POST | `/rest_files` | fuzzy:0.50->POST /api/v1/files/upload |
| GET | `/rest_files/{id}` | fuzzy:1.00->GET /api/v1/files |
| PUT | `/rest_files/{id}` | fuzzy:0.50->PUT /api/v1/files/folders/{folder_id} |
| DELETE | `/rest_files/{id}` | fuzzy:1.00->DELETE /api/v1/files/{file_id} |
| GET | `/rest_share_files` | fuzzy:0.50->GET /api/v1/files |
| GET | `/rest_share_files/{id}` | fuzzy:0.50->GET /api/v1/files |
| DELETE | `/rest_share_files/{id}` | fuzzy:0.50->DELETE /api/v1/files/{file_id} |
| GET | `/rest_file_folders` | fuzzy:0.67->GET /api/v1/mobile/file-folders |
| GET | `/rest_file_folders/{id}` | fuzzy:0.67->GET /api/v1/mobile/file-folders |
| GET | `/rest_itineraries_new` | fuzzy:0.50->GET /api/v1/itineraries |
| POST | `/rest_itineraries_new` | fuzzy:0.50->POST /api/v1/itineraries |
| GET | `/rest_itineraries_new/{id}` | fuzzy:0.50->GET /api/v1/itineraries |
| PUT | `/rest_itineraries_new/{id}` | fuzzy:0.50->PUT /api/v1/itineraries/{itinerary_id} |
| DELETE | `/rest_itineraries_new/{id}` | fuzzy:0.50->DELETE /api/v1/itineraries/{itinerary_id} |
| GET | `/rest_header_footers` | fuzzy:0.67->GET /api/v1/itineraries/header-footers |
| POST | `/rest_header_footers` | fuzzy:0.67->POST /api/v1/itineraries/header-footers |
| GET | `/rest_header_footers/{id}` | fuzzy:0.67->GET /api/v1/itineraries/header-footers |
| GET | `/rest_addfield_accounts` | fuzzy:0.50->GET /api/v1/accounts |
| POST | `/rest_addfield_accounts` | fuzzy:0.50->POST /api/v1/accounts |
| GET | `/rest_addfield_accounts/{id}` | fuzzy:0.50->GET /api/v1/accounts |
| PUT | `/rest_addfield_accounts/{id}` | fuzzy:0.50->PUT /api/v1/accounts/{account_id} |
| DELETE | `/rest_addfield_accounts/{id}` | fuzzy:0.50->DELETE /api/v1/accounts/{account_id} |
| GET | `/rest_addfield_contacts` | fuzzy:0.50->GET /api/v1/contacts |
| POST | `/rest_addfield_contacts` | fuzzy:0.50->POST /api/v1/contacts |
| GET | `/rest_addfield_contacts/{id}` | fuzzy:0.50->GET /api/v1/contacts |
| PUT | `/rest_addfield_contacts/{id}` | fuzzy:0.50->PUT /api/v1/contacts/{contact_id} |
| DELETE | `/rest_addfield_contacts/{id}` | fuzzy:0.50->DELETE /api/v1/contacts/{contact_id} |
| GET | `/rest_addfield_suppliers` | fuzzy:0.50->GET /api/v1/suppliers |
| POST | `/rest_addfield_suppliers` | fuzzy:0.50->POST /api/v1/suppliers |
| GET | `/rest_addfield_suppliers/{id}` | fuzzy:0.50->GET /api/v1/suppliers |
| PUT | `/rest_addfield_suppliers/{id}` | fuzzy:0.50->PUT /api/v1/suppliers/{supplier_id} |
| DELETE | `/rest_addfield_suppliers/{id}` | fuzzy:0.50->DELETE /api/v1/suppliers/{supplier_id} |
| GET | `/rest_addfield_personal_accounts` | fuzzy:0.50->GET /api/v1/mobile/personal-accounts |
| GET | `/rest_addfield_personal_accounts/{id}` | fuzzy:0.50->GET /api/v1/mobile/personal-accounts |
| GET | `/rest_addfield_leads` | fuzzy:0.50->GET /api/v1/leads |
| POST | `/rest_addfield_leads` | fuzzy:0.50->POST /api/v1/leads |
| GET | `/rest_addfield_leads/{id}` | fuzzy:0.50->GET /api/v1/leads |
| PUT | `/rest_addfield_leads/{id}` | fuzzy:0.50->PUT /api/v1/leads/{lead_id} |
| DELETE | `/rest_addfield_leads/{id}` | fuzzy:0.50->DELETE /api/v1/leads/{lead_id} |
| GET | `/rest_reports` | fuzzy:1.00->GET /api/v1/reports/{report_id} |
| POST | `/rest_reports` | fuzzy:0.50->POST /api/v1/reports/schedules |
| GET | `/rest_reports/{id}` | fuzzy:1.00->GET /api/v1/reports/{report_id} |
| PUT | `/rest_reports/{id}` | fuzzy:1.00->PUT /api/v1/reports/{report_id} |
| DELETE | `/rest_reports/{id}` | fuzzy:1.00->DELETE /api/v1/reports/{report_id} |
| GET | `/rest_folders` | fuzzy:0.50->GET /api/v1/files/folders |
| POST | `/rest_folders` | fuzzy:0.50->POST /api/v1/files/folders |
| GET | `/rest_folders/{id}` | fuzzy:0.50->GET /api/v1/files/folders |
| PUT | `/rest_folders/{id}` | fuzzy:0.50->PUT /api/v1/files/folders/{folder_id} |
| DELETE | `/rest_folders/{id}` | fuzzy:0.50->DELETE /api/v1/files/folders/{folder_id} |
| GET | `/rest_accounts_m` | fuzzy:0.50->GET /api/v1/accounts |
| POST | `/rest_accounts_m` | fuzzy:0.50->POST /api/v1/accounts |
| GET | `/rest_accounts_m/{id}` | fuzzy:0.50->GET /api/v1/accounts |
| PUT | `/rest_accounts_m/{id}` | fuzzy:0.50->PUT /api/v1/accounts/{account_id} |
| DELETE | `/rest_accounts_m/{id}` | fuzzy:0.50->DELETE /api/v1/accounts/{account_id} |
| GET | `/rest_file_folders_m` | fuzzy:0.50->GET /api/v1/mobile/file-folders |
| GET | `/rest_file_folders_m/{id}` | fuzzy:0.50->GET /api/v1/mobile/file-folders |
| GET | `/rest_contacts_m` | fuzzy:0.50->GET /api/v1/contacts |
| POST | `/rest_contacts_m` | fuzzy:0.50->POST /api/v1/contacts |
| GET | `/rest_contacts_m/{id}` | fuzzy:0.50->GET /api/v1/contacts |
| PUT | `/rest_contacts_m/{id}` | fuzzy:0.50->PUT /api/v1/contacts/{contact_id} |
| DELETE | `/rest_contacts_m/{id}` | fuzzy:0.50->DELETE /api/v1/contacts/{contact_id} |
| GET | `/rest_opportunities_m` | fuzzy:0.50->GET /api/v1/opportunities |
| POST | `/rest_opportunities_m` | fuzzy:0.50->POST /api/v1/opportunities |
| GET | `/rest_opportunities_m/{id}` | fuzzy:0.50->GET /api/v1/opportunities |
| PUT | `/rest_opportunities_m/{id}` | fuzzy:0.50->PUT /api/v1/opportunities/{opportunity_id} |
| DELETE | `/rest_opportunities_m/{id}` | fuzzy:0.50->DELETE /api/v1/opportunities/{opportunity_id} |
| GET | `/rest_personal_accounts_m` | fuzzy:0.50->GET /api/v1/mobile/personal-accounts |
| GET | `/rest_personal_accounts_m/{id}` | fuzzy:0.50->GET /api/v1/mobile/personal-accounts |
| GET | `/rest_leads_m` | fuzzy:0.50->GET /api/v1/leads |
| POST | `/rest_leads_m` | fuzzy:0.50->POST /api/v1/leads |
| GET | `/rest_leads_m/{id}` | fuzzy:0.50->GET /api/v1/leads |
| PUT | `/rest_leads_m/{id}` | fuzzy:0.50->PUT /api/v1/leads/{lead_id} |
| DELETE | `/rest_leads_m/{id}` | fuzzy:0.50->DELETE /api/v1/leads/{lead_id} |
| GET | `/rest_addfield_leads` | fuzzy:0.50->GET /api/v1/leads |
| POST | `/rest_addfield_leads` | fuzzy:0.50->POST /api/v1/leads |
| GET | `/rest_addfield_leads/{id}` | fuzzy:0.50->GET /api/v1/leads |
| PUT | `/rest_addfield_leads/{id}` | fuzzy:0.50->PUT /api/v1/leads/{lead_id} |
| DELETE | `/rest_addfield_leads/{id}` | fuzzy:0.50->DELETE /api/v1/leads/{lead_id} |
| GET | `/rest_user_itinerary_inclusions` | fuzzy:0.50->GET /api/v1/itineraries/user-inclusions |
| POST | `/rest_user_itinerary_inclusions` | fuzzy:0.50->POST /api/v1/itineraries/user-inclusions |
| GET | `/rest_user_itinerary_inclusions/{id}` | fuzzy:0.50->GET /api/v1/itineraries/user-inclusions |
| GET | `/rest_destinations` | fuzzy:1.00->GET /api/v1/destinations |
| POST | `/rest_destinations` | fuzzy:1.00->POST /api/v1/destinations |
| GET | `/rest_destinations/{id}` | fuzzy:1.00->GET /api/v1/destinations |
| PUT | `/rest_destinations/{id}` | fuzzy:1.00->PUT /api/v1/destinations/{destination_id} |
| DELETE | `/rest_destinations/{id}` | fuzzy:1.00->DELETE /api/v1/destinations/{destination_id} |
| GET | `/rest_sales_stages` | fuzzy:0.67->GET /api/v1/opportunities/sales-stages |
| GET | `/rest_sales_stages/{id}` | fuzzy:0.67->GET /api/v1/opportunities/sales-stages |
| GET | `/rest_experiences` | fuzzy:0.50->GET /api/v1/opportunities/experiences |
| GET | `/rest_experiences/{id}` | fuzzy:0.50->GET /api/v1/opportunities/experiences |
| GET | `/rest_opportunity_tags` | fuzzy:0.50->GET /api/v1/tags |
| POST | `/rest_opportunity_tags` | fuzzy:0.50->POST /api/v1/tags |
| GET | `/rest_opportunity_tags/{id}` | fuzzy:0.50->GET /api/v1/tags |
| PUT | `/rest_opportunity_tags/{id}` | fuzzy:0.50->PUT /api/v1/tags/{tag_id} |
| DELETE | `/rest_opportunity_tags/{id}` | fuzzy:0.50->DELETE /api/v1/tags/{tag_id} |
| GET | `/rest_inclusions` | fuzzy:0.50->GET /api/v1/itineraries/inclusions |
| POST | `/rest_inclusions` | fuzzy:0.50->POST /api/v1/itineraries/inclusions |
| GET | `/rest_inclusions/{id}` | fuzzy:0.50->GET /api/v1/itineraries/inclusions |
| DELETE | `/rest_inclusions/{id}` | fuzzy:0.50->DELETE /api/v1/itineraries/inclusions/{inclusion_id} |