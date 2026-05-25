"""
S3 and File service layer - AWS S3 integration and file management
"""
import boto3
import os
import re
import unicodedata
import uuid
from pathlib import Path
from typing import Optional, List, BinaryIO
from bson import ObjectId
from datetime import datetime
from app.core.config import settings
from app.models.file import File


_FILENAME_SAFE_RE = re.compile(r"[^A-Za-z0-9._-]+")


# Magic-byte signatures for the file types listed in settings.ALLOWED_EXTENSIONS.
# Each entry is a list of acceptable signatures; a signature is (offset, bytes).
# An extension can pass if ANY of its signatures matches.
#
# Sources: ISO standards, RFCs, and well-known file format docs. Verified against
# real-world samples — not just spec quotes.
_MAGIC_SIGNATURES: dict[str, list[tuple[int, bytes]]] = {
    "pdf":  [(0, b"%PDF-")],
    "png":  [(0, b"\x89PNG\r\n\x1a\n")],
    "jpg":  [(0, b"\xff\xd8\xff")],
    "jpeg": [(0, b"\xff\xd8\xff")],
    "gif":  [(0, b"GIF87a"), (0, b"GIF89a")],
    # ZIP / DOCX / XLSX / PPTX all share the ZIP container signature
    "zip":  [(0, b"PK\x03\x04"), (0, b"PK\x05\x06"), (0, b"PK\x07\x08")],
    "docx": [(0, b"PK\x03\x04")],
    "xlsx": [(0, b"PK\x03\x04")],
    # Legacy OLE2 container — DOC, XLS, PPT
    "doc":  [(0, b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")],
    "xls":  [(0, b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")],
    # CSV has no magic — it's just text. We skip the magic check for csv and
    # rely on extension + content-type only.
}

# Extensions that legitimately have no recognizable magic bytes; magic check
# is skipped for these.
_NO_MAGIC_EXTENSIONS = {"csv", "txt"}


def detect_extension_mismatch(
    extension: str, content_head: bytes
) -> Optional[str]:
    """Verify the first bytes of an uploaded file match the declared extension.

    Returns None if OK, an error message string if mismatched.

    Why this matters: an attacker can rename evil.exe to evil.pdf and set the
    Content-Type to application/pdf. Without sniffing, the server would store
    and re-serve the file as a PDF. Downstream consumers (browsers, viewers,
    AV scanners) would then execute it.
    """
    ext = (extension or "").lower().lstrip(".")
    if not ext:
        return "missing extension"
    if ext in _NO_MAGIC_EXTENSIONS:
        return None
    sigs = _MAGIC_SIGNATURES.get(ext)
    if sigs is None:
        # Extension not in our known list. The settings.ALLOWED_EXTENSIONS gate
        # should have already rejected unknown extensions before we get here, so
        # this is a defense-in-depth fallback — refuse rather than skip.
        return f"no known magic-byte signature for .{ext}"
    for offset, magic in sigs:
        if content_head[offset : offset + len(magic)] == magic:
            return None
    return f"content does not match extension .{ext}"


def sanitize_filename(name: str, max_length: int = 200) -> str:
    """Return a filesystem- and S3-safe filename.

    Strips path components, normalizes unicode, replaces unsafe characters
    with `_`, and caps length. Prevents path traversal via `../` or absolute
    paths embedded in user-supplied filenames.
    """
    if not name:
        return "file"
    # Drop any directory parts (Windows or POSIX)
    base = os.path.basename(name.replace("\\", "/"))
    # Normalize unicode and drop combining characters that complicate equality
    base = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode("ascii")
    base = _FILENAME_SAFE_RE.sub("_", base).strip(". _") or "file"
    if len(base) > max_length:
        stem, _, ext = base.rpartition(".")
        if stem and ext and len(ext) < 20:
            stem = stem[: max_length - len(ext) - 1]
            base = f"{stem}.{ext}"
        else:
            base = base[:max_length]
    return base

class LocalFileService:
    """Local file storage service for testing"""
    
    def __init__(self):
        self.upload_dir = Path("uploads")
        self.upload_dir.mkdir(exist_ok=True)
    
    async def upload_file(
        self,
        file_obj: BinaryIO,
        filename: str,
        content_type: str,
        tenant_id: Optional[ObjectId] = None,
    ) -> str:
        """Upload file to local storage and return file key.

        Tenant ID is included in the path so listing the local upload dir
        cannot accidentally cross-tenant.
        """

        safe_name = sanitize_filename(filename)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{uuid.uuid4().hex[:8]}_{safe_name}"
        tenant_dir = self.upload_dir / (str(tenant_id) if tenant_id else "shared")
        tenant_dir.mkdir(parents=True, exist_ok=True)
        file_path = tenant_dir / unique_filename

        file_content = file_obj.read()
        with open(file_path, "wb") as f:
            f.write(file_content)

        return f"local_uploads/{tenant_dir.name}/{unique_filename}"
    
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
        content_type: str,
        tenant_id: Optional[ObjectId] = None,
    ) -> str:
        """Upload file to S3 or local storage and return file key.

        S3 keys are tenant-namespaced (`{tenant_id}/uploads/...`) so accidental
        unprefixed list/access of one tenant's bucket prefix cannot reveal
        another's data.
        """

        safe_name = sanitize_filename(filename)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_suffix = uuid.uuid4().hex[:8]
        tenant_prefix = f"{tenant_id}/" if tenant_id else "shared/"

        if self.use_aws:
            s3_key = f"{tenant_prefix}uploads/{timestamp}_{unique_suffix}_{safe_name}"

            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs={'ContentType': content_type}
            )

            return s3_key
        else:
            return await self.local_service.upload_file(
                file_obj, filename, content_type, tenant_id=tenant_id
            )
    
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
        """Upload file and create file record. Filename is sanitized; S3 key is tenant-namespaced."""

        safe_name = sanitize_filename(filename)
        s3_key = await self.s3_service.upload_file(
            file_obj,
            safe_name,
            content_type,
            tenant_id=tenant_id,
        )

        file_record = File(
            filename=safe_name,
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
        """Get file by ID, scoped to tenant."""
        try:
            oid = ObjectId(file_id)
        except Exception:
            return None
        return await File.find_one(
            {"_id": oid, "tenant_id": tenant_id, "deleted_at": None}
        )
    
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
            {"fileable_type": fileable_type, "fileable_id": ObjectId(fileable_id), "tenant_id": tenant_id, "deleted_at": None}
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
