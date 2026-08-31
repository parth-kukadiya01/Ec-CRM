"""
AWS S3 file storage utility for CRM uploads.

When S3 is configured (AWS credentials + bucket name), files are uploaded to S3.
When S3 is NOT configured, falls back to local disk storage for development.
"""
import os
import logging
import uuid
from typing import Optional, Tuple

logger = logging.getLogger("crm_api.s3")

# Lazy-initialized S3 client to avoid import errors when boto3 is not installed
_s3_client = None
_s3_available = None


def _get_s3_client():
    """Lazy-initialize and return the S3 client."""
    global _s3_client, _s3_available
    if _s3_available is not None:
        return _s3_client if _s3_available else None

    from app.core.config import settings

    if not settings.AWS_ACCESS_KEY_ID or not settings.S3_BUCKET_NAME:
        logger.info("S3 not configured — using local file storage.")
        _s3_available = False
        return None

    try:
        import boto3
        _s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        # Quick connectivity check
        _s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        _s3_available = True
        logger.info(f"S3 connected — bucket: {settings.S3_BUCKET_NAME}")
        return _s3_client
    except Exception as e:
        logger.warning(f"S3 initialization failed ({e}). Falling back to local storage.")
        _s3_available = False
        return None


def is_s3_enabled() -> bool:
    """Check whether S3 storage is available and configured."""
    _get_s3_client()
    return bool(_s3_available)


def generate_s3_key(original_filename: str, prefix: str = "uploads") -> str:
    """Generate a unique S3 object key from an original filename."""
    ext = os.path.splitext(original_filename)[1]
    safe_name = original_filename.replace(" ", "_")
    unique_name = f"{uuid.uuid4().hex[:12]}_{safe_name}"
    return f"{prefix}/{unique_name}"


def upload_file_to_s3(
    file_content: bytes,
    original_filename: str,
    content_type: str = "application/octet-stream",
    prefix: str = "uploads",
) -> Tuple[Optional[str], str, str]:
    """
    Upload a file to S3.

    Returns:
        (s3_url, s3_key, unique_filename)
        If S3 is not available, returns (None, "", unique_filename).
    """
    from app.core.config import settings

    s3_key = generate_s3_key(original_filename, prefix)
    unique_filename = s3_key.split("/")[-1]

    client = _get_s3_client()
    if not client:
        return None, "", unique_filename

    try:
        client.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key,
            Body=file_content,
            ContentType=content_type,
        )

        # Build the public URL
        if settings.S3_CDN_DOMAIN:
            s3_url = f"https://{settings.S3_CDN_DOMAIN}/{s3_key}"
        else:
            s3_url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"

        logger.info(f"Uploaded to S3: {s3_key}")
        return s3_url, s3_key, unique_filename

    except Exception as e:
        logger.error(f"S3 upload failed: {e}")
        raise


def delete_file_from_s3(s3_key: str) -> bool:
    """Delete a file from S3 by its object key."""
    from app.core.config import settings

    client = _get_s3_client()
    if not client:
        return False

    try:
        client.delete_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key,
        )
        logger.info(f"Deleted from S3: {s3_key}")
        return True
    except Exception as e:
        logger.error(f"S3 delete failed: {e}")
        return False


def generate_presigned_url(s3_key: str, expiration: int = 3600) -> Optional[str]:
    """Generate a presigned URL for private S3 objects (valid for `expiration` seconds)."""
    from app.core.config import settings

    client = _get_s3_client()
    if not client:
        return None

    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.S3_BUCKET_NAME,
                "Key": s3_key,
            },
            ExpiresIn=expiration,
        )
        return url
    except Exception as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        return None


def check_s3_health() -> dict:
    """Return S3 connectivity status for health checks."""
    from app.core.config import settings

    if not settings.AWS_ACCESS_KEY_ID or not settings.S3_BUCKET_NAME:
        return {"s3": "not_configured"}

    client = _get_s3_client()
    if not client:
        return {"s3": "unavailable"}

    try:
        client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        return {"s3": "connected", "bucket": settings.S3_BUCKET_NAME}
    except Exception as e:
        return {"s3": "error", "detail": str(e)}
