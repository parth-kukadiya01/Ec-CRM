import os
import uuid
import re
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query, Form
from app.core.deps import get_current_user
from app.core.s3 import is_s3_enabled, upload_file_to_s3, delete_file_from_s3, sanitize_folder_name
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["FileUpload"])

# Local uploads directory (fallback when S3 is not configured)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


class DeleteFileRequest(BaseModel):
    file_url: str


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    folder: Optional[str] = Form(None),
    partner: Optional[str] = Form(None),
    company: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    try:
        content = await file.read()

        # Build clean S3 folder / prefix path based on partner or company
        if folder:
            s3_folder = folder.strip("/")
        elif partner:
            s3_folder = f"products/partner_{sanitize_folder_name(partner)}"
        elif company:
            s3_folder = f"products/company_{sanitize_folder_name(company)}"
        elif current_user.is_partner:
            p_name = current_user.account_name or current_user.full_name or f"partner_{current_user.id}"
            s3_folder = f"products/partner_{sanitize_folder_name(p_name)}"
        else:
            s3_folder = "uploads"

        if is_s3_enabled():
            # --- S3 Upload with dedicated folder ---
            s3_url, s3_key, unique_name = upload_file_to_s3(
                file_content=content,
                original_filename=file.filename or "uploaded_file",
                content_type=file.content_type or "application/octet-stream",
                prefix=s3_folder,
            )
            return {
                "success": True,
                "filename": unique_name,
                "original_name": file.filename,
                "file_url": s3_url,
                "s3_key": s3_key,
                "folder": s3_folder,
                "content_type": file.content_type,
                "size": len(content),
                "storage": "s3",
            }
        else:
            # --- Local Disk Upload (development fallback) ---
            target_dir = os.path.join(UPLOADS_DIR, s3_folder)
            os.makedirs(target_dir, exist_ok=True)

            safe_name = (file.filename or "uploaded_file").replace(' ', '_')
            unique_name = f"{uuid.uuid4().hex[:12]}_{safe_name}"
            file_path = os.path.join(target_dir, unique_name)

            with open(file_path, "wb") as buffer:
                buffer.write(content)

            file_url = f"/uploads/{s3_folder}/{unique_name}"
            return {
                "success": True,
                "filename": unique_name,
                "original_name": file.filename,
                "file_url": file_url,
                "s3_key": f"{s3_folder}/{unique_name}",
                "folder": s3_folder,
                "content_type": file.content_type,
                "size": len(content),
                "storage": "local",
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.delete("")
def delete_file(
    req: DeleteFileRequest,
    current_user: User = Depends(get_current_user)
):
    """Delete a file from S3 or local storage by its URL."""
    try:
        if is_s3_enabled():
            success = delete_file_from_s3(req.file_url)
            return {"success": success, "message": "File deleted from S3" if success else "File not found"}
        else:
            # Local fallback deletion
            url_part = req.file_url.replace("/uploads/", "").lstrip("/")
            file_path = os.path.join(UPLOADS_DIR, url_part)
            if os.path.exists(file_path):
                os.remove(file_path)
                return {"success": True, "message": "File deleted from local storage"}
            return {"success": False, "message": "Local file not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
