"""
S3 and File service layer - AWS S3 integration and file management
"""
import boto3
import os
import uuid
from pathlib import Path
from typing import Optional, List, BinaryIO
from bson import ObjectId
from datetime import datetime
from app.core.config import settings
from app.models.file import File

class LocalFileService:
    """Local file storage service for testing"""
    
    def __init__(self):
        self.upload_dir = Path("uploads")
        self.upload_dir.mkdir(exist_ok=True)
    
    async def upload_file(
        self,
        file_obj: BinaryIO,
        filename: str,
        content_type: str
    ) -> str:
        """Upload file to local storage and return file key"""
        
        # Generate unique filename
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        file_path = self.upload_dir / unique_filename
        
        # Read file content
        file_content = file_obj.read()
        
        # Write file
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        return f"local_uploads/{unique_filename}"
    
    async def download_file(self, file_key: str) -> bytes:
        """Download file from local storage"""
        
        if file_key.startswith("local_uploads/"):
            filename = file_key.replace("local_uploads/", "")
            file_path = self.upload_dir / filename
            
            with open(file_path, "rb") as f:
                return f.read()
        
        raise Exception("Invalid file key format")
    
    async def delete_file(self, file_key: str) -> bool:
        """Delete file from local storage"""
        
        try:
            if file_key.startswith("local_uploads/"):
                filename = file_key.replace("local_uploads/", "")
                file_path = self.upload_dir / filename
                file_path.unlink()
                return True
            return False
        except Exception:
            return False
    
    async def get_presigned_url(
        self,
        file_key: str,
        expiration: int = 3600
    ) -> str:
        """Generate local file URL (for testing)"""
        
        if file_key.startswith("local_uploads/"):
            filename = file_key.replace("local_uploads/", "")
            return f"http://localhost:8000/files/local/{filename}"
        
        raise Exception("Invalid file key format")

class S3Service:
    """Service for AWS S3 operations with local storage fallback"""
    
    def __init__(self):
        # Check if AWS credentials are properly configured
        if (settings.AWS_ACCESS_KEY_ID and 
            settings.AWS_SECRET_ACCESS_KEY and 
            settings.AWS_ACCESS_KEY_ID != "your_access_key" and 
            settings.AWS_SECRET_ACCESS_KEY != "your_secret_key"):
            
            # Use AWS S3
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            self.bucket_name = settings.S3_BUCKET_NAME
            self.use_aws = True
        else:
            # Use local storage
            self.local_service = LocalFileService()
            self.use_aws = False
    
    async def upload_file(
        self,
        file_obj: BinaryIO,
        filename: str,
        content_type: str
    ) -> str:
        """Upload file to S3 or local storage and return file key"""
        
        if self.use_aws:
            # Generate unique filename
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            s3_key = f"uploads/{timestamp}_{filename}"
            
            # Upload to S3
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs={'ContentType': content_type}
            )
            
            return s3_key
        else:
            # Use local storage
            return await self.local_service.upload_file(file_obj, filename, content_type)
    
    async def download_file(self, file_key: str) -> bytes:
        """Download file from S3 or local storage"""
        
        if self.use_aws:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=file_key
            )
            return response['Body'].read()
        else:
            return await self.local_service.download_file(file_key)
    
    async def delete_file(self, file_key: str) -> bool:
        """Delete file from S3 or local storage"""
        
        if self.use_aws:
            try:
                self.s3_client.delete_object(
                    Bucket=self.bucket_name,
                    Key=file_key
                )
                return True
            except Exception:
                return False
        else:
            return await self.local_service.delete_file(file_key)
    
    async def get_presigned_url(
        self,
        file_key: str,
        expiration: int = 3600
    ) -> str:
        """Generate presigned URL for temporary access"""
        
        if self.use_aws:
            return self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': file_key},
                ExpiresIn=expiration
            )
        else:
            return await self.local_service.get_presigned_url(file_key, expiration)


class FileService:
    """Service for File management"""
    
    def __init__(self):
        self.s3_service = S3Service()
    
    async def upload_file(
        self,
        file_obj: BinaryIO,
        filename: str,
        content_type: str,
        file_size: int,
        user_id: ObjectId,
        tenant_id: ObjectId,
        fileable_type: Optional[str] = None,
        fileable_id: Optional[str] = None,
        category: Optional[str] = None
    ) -> File:
        """Upload file and create file record"""
        
        # Upload to S3
        s3_key = await self.s3_service.upload_file(
            file_obj,
            filename,
            content_type
        )
        
        # Create file record
        file_record = File(
            filename=filename,
            original_filename=filename,
            file_path=s3_key,
            file_size=file_size,
            mime_type=content_type,
            storage_type="s3",
            s3_bucket=settings.S3_BUCKET_NAME,
            s3_key=s3_key,
            fileable_type=fileable_type,
            fileable_id=ObjectId(fileable_id) if fileable_id else None,
            category=category,
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id
        )
        
        await file_record.insert()
        return file_record
    
    async def get_file(
        self,
        file_id: str,
        tenant_id: ObjectId
    ) -> Optional[File]:
        """Get file by ID"""
        file_record = await File.get(ObjectId(file_id))
        
        if file_record and file_record.tenant_id == tenant_id and not file_record.deleted_at:
            return file_record
        return None
    
    async def download_file(
        self,
        file_id: str,
        tenant_id: ObjectId
    ) -> Optional[tuple[bytes, str, str]]:
        """Download file content"""
        file_record = await self.get_file(file_id, tenant_id)
        
        if not file_record:
            return None
        
        # Download from S3
        content = await self.s3_service.download_file(file_record.s3_key)
        
        # Increment download count
        await file_record.increment_download_count()
        
        return content, file_record.original_filename, file_record.mime_type
    
    async def delete_file(
        self,
        file_id: str,
        tenant_id: ObjectId,
        user_id: ObjectId
    ) -> bool:
        """Delete file"""
        file_record = await self.get_file(file_id, tenant_id)
        
        if not file_record:
            return False
        
        # Only owner can delete
        if file_record.owner_id != user_id:
            return False
        
        # Delete from S3
        if file_record.storage_type == "s3":
            await self.s3_service.delete_file(file_record.s3_key)
        
        # Soft delete record
        await file_record.soft_delete()
        return True
    
    async def get_user_files(
        self,
        user_id: ObjectId,
        tenant_id: ObjectId,
        fileable_type: Optional[str] = None,
        fileable_id: Optional[str] = None,
        page: int = 1,
        per_page: int = 10
    ) -> tuple[List[File], int]:
        """Get all files for a user with pagination"""
        
        # Build query
        query = {
            "owner_id": user_id,
            "tenant_id": tenant_id,
            "deleted_at": None
        }
        
        if fileable_type:
            query["fileable_type"] = fileable_type
        if fileable_id:
            query["fileable_id"] = ObjectId(fileable_id)
        
        # Get total count
        total = await File.find(query).count()
        
        # Get files with pagination
        skip = (page - 1) * per_page
        files = await File.find(query).sort("-created_at").skip(skip).limit(per_page).to_list()
        
        return files, total
    
    async def get_files_by_entity(
        self,
        fileable_type: str,
        fileable_id: str,
        tenant_id: ObjectId
    ) -> List[File]:
        """Get all files for a specific entity"""
        files = await File.find(
            File.fileable_type == fileable_type,
            File.fileable_id == ObjectId(fileable_id),
            File.tenant_id == tenant_id,
            File.deleted_at == None
        ).sort("-created_at").to_list()
        
        return files
    
    async def get_presigned_url(
        self,
        file_id: str,
        tenant_id: ObjectId,
        expiration: int = 3600
    ) -> Optional[str]:
        """Get presigned URL for file"""
        file_record = await self.get_file(file_id, tenant_id)
        
        if not file_record or file_record.storage_type != "s3":
            return None
        
        url = await self.s3_service.get_presigned_url(
            file_record.s3_key,
            expiration
        )
        
        return url
