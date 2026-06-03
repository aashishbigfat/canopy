"""
Import/Export service for CSV and Excel files
"""
import pandas as pd
from io import BytesIO
from typing import List, Dict
from fastapi import UploadFile
from bson import ObjectId

from app.models.account import Account
from app.models.picklists import AccountType, Industry

class ImportExportService:
    """Service for importing and exporting data"""
    
    async def export_accounts_to_excel(
        self,
        accounts: List[Account],
        format: str = "xlsx"
    ) -> bytes:
        """Export accounts to Excel or CSV"""
        
        # Convert accounts to dict
        data = []
        for account in accounts:
            # Picklist lookups scoped to this account's tenant OR platform defaults.
            acc_type = None
            if account.acc_type_id:
                acc_type = await AccountType.find_one(
                    {
                        "_id": account.acc_type_id,
                        "$or": [{"tenant_id": account.tenant_id}, {"tenant_id": None}],
                    }
                )
            industry = None
            if account.industry_id:
                industry = await Industry.find_one(
                    {
                        "_id": account.industry_id,
                        "$or": [{"tenant_id": account.tenant_id}, {"tenant_id": None}],
                    }
                )
            
            data.append({
                "Name": account.name,
                "Email": account.email,
                "Phone": account.phone,
                "Website": account.website,
                "Account Type": acc_type.name if acc_type else "",
                "Industry": industry.name if industry else "",
                "Billing Street": account.billing_street,
                "Billing City": account.billing_city,
                "Billing State": account.billing_state,
                "Billing Zip": account.billing_zip,
                "Billing Country": account.billing_country,
                "Shipping Street": account.shipping_street,
                "Shipping City": account.shipping_city,
                "Shipping State": account.shipping_state,
                "Shipping Zip": account.shipping_zip,
                "Shipping Country": account.shipping_country,
                "Created At": account.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "Updated At": account.updated_at.strftime("%Y-%m-%d %H:%M:%S")
            })
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Export to bytes
        output = BytesIO()
        if format == "xlsx":
            df.to_excel(output, index=False, engine='openpyxl')
        elif format == "csv":
            df.to_csv(output, index=False)
        
        output.seek(0)
        return output.getvalue()
    
    async def import_accounts_from_file(
        self,
        file: UploadFile,
        tenant_id: ObjectId,
        user_id: ObjectId
    ) -> Dict:
        """Import accounts from Excel or CSV"""
        
        content = await file.read()
        
        # Read file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(content))
        else:
            df = pd.read_excel(BytesIO(content))
        
        imported = 0
        errors = []
        
        # Get picklist mappings (platform defaults + tenant overrides)
        # picklist_type prevents cross-contamination in shared 'picklists' collection
        from app.core.picklist_query import build_picklist_query, dedup_picklist_items
        from app.models.tenant import Tenant
        
        tenant = await Tenant.get(tenant_id)
        tenant_industry = tenant.industry if tenant else None
        
        account_types = {at.name: at.id for at in dedup_picklist_items(await AccountType.find(build_picklist_query(tenant_id, industry=tenant_industry, active_only=False, picklist_type="account_type")).to_list())}
        industries = {ind.name: ind.id for ind in dedup_picklist_items(await Industry.find(build_picklist_query(tenant_id, industry=tenant_industry, active_only=False, picklist_type="industry")).to_list())}
        
        # Import each row
        for index, row in df.iterrows():
            try:
                # Map picklist values
                acc_type_id = account_types.get(row.get('Account Type')) if pd.notna(row.get('Account Type')) else None
                industry_id = industries.get(row.get('Industry')) if pd.notna(row.get('Industry')) else None
                
                account = Account(
                    name=row['Name'],
                    email=row.get('Email') if pd.notna(row.get('Email')) else None,
                    phone=row.get('Phone') if pd.notna(row.get('Phone')) else None,
                    website=row.get('Website') if pd.notna(row.get('Website')) else None,
                    acc_type_id=acc_type_id,
                    industry_id=industry_id,
                    billing_street=row.get('Billing Street') if pd.notna(row.get('Billing Street')) else None,
                    billing_city=row.get('Billing City') if pd.notna(row.get('Billing City')) else None,
                    billing_state=row.get('Billing State') if pd.notna(row.get('Billing State')) else None,
                    billing_zip=row.get('Billing Zip') if pd.notna(row.get('Billing Zip')) else None,
                    billing_country=row.get('Billing Country') if pd.notna(row.get('Billing Country')) else None,
                    tenant_id=tenant_id,
                    owner_id=user_id,
                    created_by=user_id
                )
                
                await account.insert()
                imported += 1
                
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
        
        return {
            "imported": imported,
            "total": len(df),
            "errors": errors
        }
    
    async def export_contacts_to_excel(
        self,
        contacts: List,
        format: str = "xlsx"
    ) -> bytes:
        """Export contacts to Excel or CSV"""
        from app.models.contact import Contact
        
        # Convert contacts to dict
        data = []
        for contact in contacts:
            data.append({
                "Salutation": contact.salutation or "",
                "First Name": contact.first_name,
                "Middle Name": contact.middle_name or "",
                "Last Name": contact.last_name,
                "Email": contact.email or "",
                "Phone": contact.phone or "",
                "Mobile": contact.mobile or "",
                "Title": contact.title or "",
                "Department": contact.department or "",
                "Mailing Street": contact.mailing_street or "",
                "Mailing City": contact.mailing_city or "",
                "Mailing State": contact.mailing_state or "",
                "Mailing Zip": contact.mailing_zip or "",
                "Mailing Country": contact.mailing_country or "",
                "Created At": contact.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "Updated At": contact.updated_at.strftime("%Y-%m-%d %H:%M:%S")
            })
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Export to bytes
        output = BytesIO()
        if format == "xlsx":
            df.to_excel(output, index=False, engine='openpyxl')
        elif format == "csv":
            df.to_csv(output, index=False)
        
        output.seek(0)
        return output.getvalue()
    
    async def import_contacts_from_file(
        self,
        file: UploadFile,
        tenant_id: ObjectId,
        user_id: ObjectId
    ) -> Dict:
        """Import contacts from Excel or CSV"""
        from app.models.contact import Contact
        
        content = await file.read()
        
        # Read file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(content))
        else:
            df = pd.read_excel(BytesIO(content))
        
        imported = 0
        errors = []
        
        # Import each row
        for index, row in df.iterrows():
            try:
                contact = Contact(
                    salutation=row.get('Salutation') if pd.notna(row.get('Salutation')) else None,
                    first_name=row['First Name'],
                    middle_name=row.get('Middle Name') if pd.notna(row.get('Middle Name')) else None,
                    last_name=row['Last Name'],
                    email=row.get('Email') if pd.notna(row.get('Email')) else None,
                    phone=row.get('Phone') if pd.notna(row.get('Phone')) else None,
                    mobile=row.get('Mobile') if pd.notna(row.get('Mobile')) else None,
                    title=row.get('Title') if pd.notna(row.get('Title')) else None,
                    department=row.get('Department') if pd.notna(row.get('Department')) else None,
                    mailing_street=row.get('Mailing Street') if pd.notna(row.get('Mailing Street')) else None,
                    mailing_city=row.get('Mailing City') if pd.notna(row.get('Mailing City')) else None,
                    mailing_state=row.get('Mailing State') if pd.notna(row.get('Mailing State')) else None,
                    mailing_zip=row.get('Mailing Zip') if pd.notna(row.get('Mailing Zip')) else None,
                    mailing_country=row.get('Mailing Country') if pd.notna(row.get('Mailing Country')) else None,
                    tenant_id=tenant_id,
                    owner_id=user_id,
                    created_by=user_id
                )
                
                await contact.insert()
                imported += 1
                
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
        
        return {
            "imported": imported,
            "total": len(df),
            "errors": errors
        }

    async def import_leads_from_file(
        self,
        file: UploadFile,
        tenant_id: ObjectId,
        user_id: ObjectId
    ) -> Dict:
        """Import leads from Excel or CSV"""
        from app.models.consolidated_picklists import LeadStatus, Source, SourceMedium, DestinationPicklist
        from app.models.picklists import Industry
        from app.core.picklist_query import build_picklist_query, dedup_picklist_items
        from app.models.tenant import Tenant
        from app.schemas.lead import LeadCreate
        from app.services.lead_service import LeadService
        import pandas as pd
        import math

        content = await file.read()
        
        # Read file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(content))
        else:
            df = pd.read_excel(BytesIO(content))
        
        # Clean header names (strip spaces)
        df.columns = [col.strip() if isinstance(col, str) else col for col in df.columns]

        tenant = await Tenant.get(tenant_id)
        tenant_industry = tenant.industry if tenant else None
        
        # Fetch picklist mappings
        lead_statuses = {ls.name.lower(): ls.id for ls in dedup_picklist_items(await LeadStatus.find(build_picklist_query(tenant_id, industry=tenant_industry, active_only=False, picklist_type="lead_status")).to_list())}
        sources = {src.name.lower(): src.id for src in dedup_picklist_items(await Source.find(build_picklist_query(tenant_id, industry=tenant_industry, active_only=False, picklist_type="source")).to_list())}
        source_mediums = {sm.name.lower(): sm.id for sm in dedup_picklist_items(await SourceMedium.find(build_picklist_query(tenant_id, industry=tenant_industry, active_only=False, picklist_type="source_medium")).to_list())}
        industries = {ind.name.lower(): ind.id for ind in dedup_picklist_items(await Industry.find(build_picklist_query(tenant_id, industry=tenant_industry, active_only=False, picklist_type="industry")).to_list())}
        
        imported = 0
        skipped = 0
        errors = []
        
        lead_service = LeadService()
        
        # We need a helper to safely get values from pandas series
        def get_val(row, key, default=None):
            if key not in row:
                return default
            val = row[key]
            if pd.isna(val):
                return default
            if isinstance(val, str):
                val = val.strip()
                if val == "":
                    return default
            return val

        for index, row in df.iterrows():
            row_num = index + 2
            try:
                # Require First Name and Last Name
                first_name = get_val(row, 'First Name')
                last_name = get_val(row, 'Last Name')
                
                # Check for standard mapping or alternative mappings
                if not first_name:
                    first_name = get_val(row, 'first_name')
                if not last_name:
                    last_name = get_val(row, 'last_name')
                
                if not first_name or not last_name:
                    errors.append(f"Row {row_num}: Missing required field 'First Name' or 'Last Name'")
                    continue

                # Map picklists safely
                status_val = get_val(row, 'Lead Status') or get_val(row, 'lead_status') or get_val(row, 'Status')
                status_id = None
                if status_val:
                    status_id = lead_statuses.get(str(status_val).lower())
                    if not status_id:
                        errors.append(f"Row {row_num}: Invalid Lead Status '{status_val}'")
                        continue

                source_val = get_val(row, 'Source') or get_val(row, 'source')
                source_id = None
                if source_val:
                    source_id = sources.get(str(source_val).lower())
                    if not source_id:
                        errors.append(f"Row {row_num}: Invalid Source '{source_val}'")
                        continue

                sm_val = get_val(row, 'Source Medium') or get_val(row, 'source_medium')
                sm_id = None
                if sm_val:
                    sm_id = source_mediums.get(str(sm_val).lower())
                    if not sm_id:
                        errors.append(f"Row {row_num}: Invalid Source Medium '{sm_val}'")
                        continue

                ind_val = get_val(row, 'Industry') or get_val(row, 'industry')
                ind_id = None
                if ind_val:
                    ind_id = industries.get(str(ind_val).lower())
                    if not ind_id:
                        errors.append(f"Row {row_num}: Invalid Industry '{ind_val}'")
                        continue

                # Parse values for other fields
                salutation = get_val(row, 'Salutation')
                middle_name = get_val(row, 'Middle Name')
                email = get_val(row, 'Email')
                phone = get_val(row, 'Phone')
                mobile = get_val(row, 'Mobile')
                company = get_val(row, 'Company')
                title = get_val(row, 'Title')
                website = get_val(row, 'Website')
                street = get_val(row, 'Street')
                city = get_val(row, 'City')
                state = get_val(row, 'State')
                zip_code = get_val(row, 'Zip') or get_val(row, 'Postal Code') or get_val(row, 'Zip/Postal Code')
                country = get_val(row, 'Country')
                
                no_employees_raw = get_val(row, 'No of Employees') or get_val(row, 'No. of Employees') or get_val(row, 'Employees')
                no_employees = None
                if no_employees_raw is not None:
                    try:
                        no_employees = int(float(no_employees_raw))
                    except Exception:
                        pass
                
                segment = get_val(row, 'Segment', 'B2C')
                campaign_name = get_val(row, 'Campaign Name')
                source_medium = get_val(row, 'Source Medium Text') or get_val(row, 'source_medium_text')

                # Create the LeadCreate schema object
                # Note: fields that are converted to string ID are mapped to their respective IDs
                lead_create_data = {
                    "salutation": salutation,
                    "first_name": first_name,
                    "middle_name": middle_name,
                    "last_name": last_name,
                    "email": email,
                    "phone": phone,
                    "mobile": mobile,
                    "company": company,
                    "title": title,
                    "no_employees": no_employees,
                    "website": website,
                    "street": street,
                    "city": city,
                    "state": state,
                    "zip": str(zip_code) if zip_code is not None else None,
                    "country": country,
                    "lead_status_id": str(status_id) if status_id else None,
                    "source_id": str(source_id) if source_id else None,
                    "source_medium_id": str(sm_id) if sm_id else None,
                    "industry_id": str(ind_id) if ind_id else None,
                    "segment": segment,
                    "campaign_name": campaign_name,
                    "source_medium": source_medium,
                    "creation_type": "import"
                }

                # Let's see if there are travel/industry specific columns.
                # E.g. "Travel Date", "No of Pax", etc.
                # If they exist, parse and add to industry_data
                industry_data = {}
                travel_date = get_val(row, 'Travel Date') or get_val(row, 'travel_date')
                if travel_date:
                    # try to parse as ISO or standard date
                    industry_data['travel_date'] = str(travel_date)
                
                no_of_pax = get_val(row, 'No of Pax') or get_val(row, 'no_of_pax') or get_val(row, 'Pax')
                if no_of_pax is not None:
                    try:
                        industry_data['no_of_pax'] = int(float(no_of_pax))
                    except Exception:
                        pass
                
                # Check for Destinations
                # Destination names could be a list (comma separated) or a single name.
                # In backend, industry_data expects destination_ids. Let's see if we can resolve destinations.
                dest_val = get_val(row, 'Destinations') or get_val(row, 'destinations')
                if dest_val:
                    # destination_names list
                    dest_names = [d.strip() for d in str(dest_val).split(',') if d.strip()]
                    dest_ids = []
                    for dname in dest_names:
                        # find a destination by name (platform default or tenant)
                        dest_item = await DestinationPicklist.find_one({
                            "name": {"$regex": f"^{dname}$", "$options": "i"},
                            "picklist_type": "destination",
                            "$or": [{"tenant_id": tenant_id}, {"tenant_id": None}]
                        })
                        if dest_item:
                            dest_ids.append(str(dest_item.id))
                    if dest_ids:
                        industry_data['destination_ids'] = dest_ids

                lead_create_data["industry_data"] = industry_data

                lead_create = LeadCreate(**lead_create_data)
                
                # Create the lead via LeadService to invoke all standard pipelines (BD, deduplication, notifications)
                await lead_service.create_lead(
                    lead_data=lead_create,
                    user_id=user_id,
                    tenant_id=tenant_id,
                    auto_assign=False # User who imports owns them by default
                )
                imported += 1
                
            except ValueError as ve:
                # Catch deduplication / ValueError as skipped / duplicate
                skipped += 1
                errors.append(f"Row {row_num}: {str(ve)}")
            except Exception as e:
                # Other validation or save errors
                errors.append(f"Row {row_num}: {str(e)}")
        
        return {
            "imported": imported,
            "skipped": skipped,
            "total": len(df),
            "errors": errors
        }

