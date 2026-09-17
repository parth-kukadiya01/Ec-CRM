"""
AWS S3 file storage utility for CRM uploads.

When S3 is configured (AWS credentials + bucket name), files are uploaded to S3.
When S3 is NOT configured, falls back to local disk storage for development.
"""
import os
import logging
import uuid
import mimetypes
import base64
import re
import hashlib
from typing import Optional, Tuple
from urllib.parse import urlparse

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


def sanitize_folder_name(name: Optional[str], default: str = "general") -> str:
    """Sanitize partner or company name into a clean folder name for S3."""
    if not name:
        return default
    clean = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(name).strip())
    clean = re.sub(r'_+', '_', clean).strip('_')
    return clean or default


def generate_s3_key(
    original_filename: str,
    prefix: str = "uploads",
    file_content: Optional[bytes] = None
) -> str:
    """
    Generate an S3 object key.
    Uses SHA-256 content hashing to ensure identical images share the exact same key (Deduplication).
    """
    safe_name = original_filename.replace(" ", "_")
    if file_content:
        content_hash = hashlib.sha256(file_content).hexdigest()[:16]
        unique_name = f"{content_hash}_{safe_name}"
    else:
        unique_name = f"{uuid.uuid4().hex[:12]}_{safe_name}"

    clean_prefix = prefix.strip("/") if prefix else "uploads"
    return f"{clean_prefix}/{unique_name}"


def extract_s3_key(url_or_key: Optional[str]) -> Optional[str]:
    """
    Extract the S3 object key from a full URL (S3, CloudFront, relative /uploads/...) or raw key.
    """
    if not url_or_key:
        return None

    raw = str(url_or_key).strip()
    if not raw:
        return None

    # Handle full http/https URLs
    if raw.startswith("http://") or raw.startswith("https://"):
        parsed = urlparse(raw)
        path = parsed.path.lstrip("/")
        return path if path else None

    # Handle leading slash (e.g. /uploads/...)
    if raw.startswith("/"):
        return raw.lstrip("/")

    return raw


def upload_file_to_s3(
    file_content: bytes,
    original_filename: str,
    content_type: Optional[str] = None,
    prefix: str = "uploads",
    custom_key: Optional[str] = None,
) -> Tuple[Optional[str], str, str]:
    """
    Upload a file to S3 with duplicate prevention (Deduplication).
    If the identical image already exists in S3 under the folder, reuses the existing URL without storing a duplicate.

    Returns:
        (s3_url, s3_key, unique_filename)
        If S3 is not available, returns (None, "", unique_filename).
    """
    from app.core.config import settings

    if custom_key:
        s3_key = custom_key.lstrip("/")
    else:
        s3_key = generate_s3_key(original_filename, prefix, file_content=file_content)

    unique_filename = s3_key.split("/")[-1]

    if not content_type or content_type == "application/octet-stream":
        guessed_type, _ = mimetypes.guess_type(original_filename)
        if guessed_type:
            content_type = guessed_type
        else:
            content_type = "application/octet-stream"

    client = _get_s3_client()
    if not client:
        return None, "", unique_filename

    # Build the public URL
    if settings.S3_CDN_DOMAIN:
        s3_url = f"https://{settings.S3_CDN_DOMAIN}/{s3_key}"
    else:
        s3_url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"

    try:
        # Check if the file already exists in S3 (Zero Duplicate Storage)
        try:
            client.head_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
            logger.info(f"Deduplication hit: {s3_key} already exists in S3. Reusing existing image URL.")
            return s3_url, s3_key, unique_filename
        except Exception:
            # File does not exist yet, proceed to upload
            pass

        client.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=s3_key,
            Body=file_content,
            ContentType=content_type,
        )

        logger.info(f"Uploaded new unique image to S3: {s3_key}")
        return s3_url, s3_key, unique_filename

    except Exception as e:
        logger.error(f"S3 upload failed: {e}")
        raise


def upload_base64_or_data_uri_to_s3(
    data_uri: str,
    prefix: str = "uploads",
    fallback_filename: str = "product_image.png"
) -> Optional[str]:
    """
    If input is a base64 data URI (data:image/...;base64,...), upload it to S3 with deduplication and return the S3 URL.
    If it's already a regular URL (http/https), returns the URL directly.
    """
    if not data_uri or not isinstance(data_uri, str):
        return data_uri

    if not data_uri.startswith("data:"):
        return data_uri

    try:
        header, encoded = data_uri.split(",", 1)
        content_type = "image/png"
        if ";" in header:
            content_type = header.split(";")[0].replace("data:", "")

        file_bytes = base64.b64decode(encoded)
        ext = mimetypes.guess_extension(content_type) or ".png"
        if not ext.startswith("."):
            ext = f".{ext}"

        safe_filename = os.path.splitext(fallback_filename)[0] + ext
        s3_url, _, _ = upload_file_to_s3(
            file_content=file_bytes,
            original_filename=safe_filename,
            content_type=content_type,
            prefix=prefix,
        )
        return s3_url
    except Exception as e:
        logger.error(f"Failed to decode and upload base64 to S3: {e}")
        return data_uri


def delete_file_from_s3(url_or_key: Optional[str]) -> bool:
    """Delete a file from S3 by its object key or full S3 URL."""
    from app.core.config import settings

    s3_key = extract_s3_key(url_or_key)
    if not s3_key:
        return False

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
        logger.error(f"S3 delete failed ({s3_key}): {e}")
        return False


def generate_presigned_url(url_or_key: str, expiration: int = 3600) -> Optional[str]:
    """Generate a presigned URL for private S3 objects (valid for `expiration` seconds)."""
    from app.core.config import settings

    s3_key = extract_s3_key(url_or_key)
    if not s3_key:
        return None

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
