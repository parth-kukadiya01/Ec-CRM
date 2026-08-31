import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from app.core.deps import get_current_user
from app.core.s3 import is_s3_enabled, upload_file_to_s3
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["FileUpload"])

# Local uploads directory (fallback when S3 is not configured)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    try:
        content = await file.read()
        ext = os.path.splitext(file.filename)[1]

        if is_s3_enabled():
            # --- S3 Upload ---
            s3_url, s3_key, unique_name = upload_file_to_s3(
                file_content=content,
                original_filename=file.filename,
                content_type=file.content_type or "application/octet-stream",
            )
            return {
                "success": True,
                "filename": unique_name,
                "original_name": file.filename,
                "file_url": s3_url,
                "content_type": file.content_type,
                "size": len(content),
                "storage": "s3",
            }
        else:
            # --- Local Disk Upload (development fallback) ---
            unique_name = f"{uuid.uuid4().hex[:12]}_{file.filename.replace(' ', '_')}"
            file_path = os.path.join(UPLOADS_DIR, unique_name)

            with open(file_path, "wb") as buffer:
                buffer.write(content)

            file_url = f"/uploads/{unique_name}"
            return {
                "success": True,
                "filename": unique_name,
                "original_name": file.filename,
                "file_url": file_url,
                "content_type": file.content_type,
                "size": len(content),
                "storage": "local",
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
