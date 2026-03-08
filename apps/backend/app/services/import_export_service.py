"""
Import/Export service for CSV and Excel files
"""
import pandas as pd
from io import BytesIO
from typing import List, Dict
from fastapi import UploadFile
from bson import ObjectId

from app.models.account import Account
from app.models.picklists import AccountType, Industry, Rating

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
            # Get related data
            acc_type = await AccountType.get(account.acc_type_id) if account.acc_type_id else None
            industry = await Industry.get(account.industry_id) if account.industry_id else None
            rating = await Rating.get(account.rating_id) if account.rating_id else None
            
            data.append({
                "Name": account.name,
                "Email": account.email,
                "Phone": account.phone,
                "Website": account.website,
                "Account Type": acc_type.name if acc_type else "",
                "Industry": industry.name if industry else "",
                "Rating": rating.name if rating else "",
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
        
        # Get picklist mappings
        account_types = {at.name: at.id for at in await AccountType.find(
            AccountType.tenant_id == tenant_id
        ).to_list()}
        
        industries = {ind.name: ind.id for ind in await Industry.find(
            Industry.tenant_id == tenant_id
        ).to_list()}
        
        ratings = {rat.name: rat.id for rat in await Rating.find_all().to_list()}
        
        # Import each row
        for index, row in df.iterrows():
            try:
                # Map picklist values
                acc_type_id = account_types.get(row.get('Account Type')) if pd.notna(row.get('Account Type')) else None
                industry_id = industries.get(row.get('Industry')) if pd.notna(row.get('Industry')) else None
                rating_id = ratings.get(row.get('Rating')) if pd.notna(row.get('Rating')) else None
                
                account = Account(
                    name=row['Name'],
                    email=row.get('Email') if pd.notna(row.get('Email')) else None,
                    phone=row.get('Phone') if pd.notna(row.get('Phone')) else None,
                    website=row.get('Website') if pd.notna(row.get('Website')) else None,
                    acc_type_id=acc_type_id,
                    industry_id=industry_id,
                    rating_id=rating_id,
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
