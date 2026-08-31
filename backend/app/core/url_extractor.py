import re
import html
import ssl
import urllib.request
import urllib.parse
from typing import Dict, Any

def extract_product_info_from_url(url: str) -> Dict[str, Any]:
    if not url:
        return {"success": False, "image_url": "", "title": "", "error": "URL is empty"}
    
    url = url.strip()
    if not (url.startswith("http://") or url.startswith("https://") or url.startswith("data:")):
        url = "https://" + url

    # If it's already a data URI or direct image extension or common image CDN
    if url.startswith("data:image/"):
        return {"success": True, "image_url": url, "title": ""}
    
    ext_pattern = re.compile(r"\.(jpg|jpeg|png|webp|gif|svg|avif|bmp)(\?.*)?$", re.IGNORECASE)
    if ext_pattern.search(url) or "media-amazon.com/images" in url:
        return {"success": True, "image_url": url, "title": ""}

    # Create unverified SSL context to avoid local cert errors on various domains
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as response:
            content_type = response.headers.get("Content-Type", "").lower()
            if "image/" in content_type:
                return {"success": True, "image_url": url, "title": ""}
            
            raw_bytes = response.read(600000) # Read up to 600KB
            charset = response.headers.get_content_charset() or "utf-8"
            html_text = raw_bytes.decode(charset, errors="replace")

            # Extract Title
            title = ""
            title_matches = [
                re.search(r'<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']', html_text, re.IGNORECASE),
                re.search(r'<meta\s+content=["\'](.*?)["\']\s+property=["\']og:title["\']', html_text, re.IGNORECASE),
                re.search(r'<title[^>]*>(.*?)</title>', html_text, re.IGNORECASE | re.DOTALL),
            ]
            for tm in title_matches:
                if tm and tm.group(1).strip():
                    title = html.unescape(tm.group(1).strip())
                    break

            # Extract Image URL
            patterns = [
                r'<meta\s+property=["\']og:image:secure_url["\']\s+content=["\'](.*?)["\']',
                r'<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']',
                r'<meta\s+content=["\'](.*?)["\']\s+property=["\']og:image["\']',
                r'<meta\s+(?:name|property)=["\']twitter:image(?:[:\w]+)?["\']\s+content=["\'](.*?)["\']',
                r'<meta\s+content=["\'](.*?)["\']\s+(?:name|property)=["\']twitter:image',
                r'data-old-hires=["\']([^"\']+)["\']',
                r'data-a-dynamic-image=["\']\{&quot;([^&"\']+)&quot;',
                r'data-a-dynamic-image=["\']\{"([^"\']+)":',
                r'id=["\']landingImage["\'][^>]*src=["\']([^"\']+)["\']',
                r'id=["\']imgBlkFront["\'][^>]*src=["\']([^"\']+)["\']',
                r'<link\s+rel=["\']image_src["\']\s+href=["\'](.*?)["\']',
                r'<link\s+href=["\'](.*?)["\']\s+rel=["\']image_src["\']',
                r'<meta\s+itemprop=["\']image["\']\s+content=["\'](.*?)["\']',
                r'"image"\s*:\s*\[?\s*"([^"]+)"',
                r'id=["\']icImg["\'][^>]*src=["\']([^"\']+)["\']',
                r'<img\s+[^>]*class=["\'][^"\']*product[^"\']*image[^"\']*["\'][^>]*src=["\']([^"\']+)["\']',
            ]

            for p in patterns:
                m = re.search(p, html_text, re.IGNORECASE)
                if m and m.group(1).strip():
                    img = html.unescape(m.group(1).strip())
                    if img.startswith("//"):
                        img = "https:" + img
                    elif not (img.startswith("http://") or img.startswith("https://") or img.startswith("data:")):
                        img = urllib.parse.urljoin(url, img)
                    return {"success": True, "image_url": img, "title": title}

            return {"success": False, "image_url": "", "title": title, "message": "No product image found in page metadata"}
    except Exception as e:
        return {"success": False, "image_url": "", "error": str(e)}
