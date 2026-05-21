import logging
import re
import ipaddress
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.utils.auth_helpers import get_current_user_id, get_authorized_scan
from app.services.report_engine import generate_pdf_report, generate_json_report, generate_txt_report

logger = logging.getLogger(__name__)

router = APIRouter()

def get_sanitized_filename(url: str, extension: str) -> str:
    """
    Sanitizes the domain name/host from the scan URL to use as a meaningful filename.
    Handles localhost, IPv4, IPv6, credentials, paths, port numbers, etc.
    Maps localhost and all local/private IPs to 'local_ip'.
    """
    if not url:
        return f"phishguard_report_suspicious_url.{extension}"
    
    # 1. Extract host/domain
    domain = url
    if "://" in domain:
        domain = domain.split("://", 1)[1]
    
    # Strip path, query, fragment
    domain = domain.split("/", 1)[0]
    domain = domain.split("?", 1)[0]
    domain = domain.split("#", 1)[0]
    
    # Strip user credentials (user:pass@host)
    if "@" in domain:
        domain = domain.split("@", 1)[-1]
        
    # Handle IPv6 brackets and strip port
    if domain.startswith("["):
        if "]" in domain:
            parts = domain.split("]", 1)
            domain = parts[0][1:]  # get inside brackets (the IPv6 address)
    else:
        if ":" in domain:
            domain = domain.split(":", 1)[0]
            
    domain = domain.strip().lower()
    
    # 2. Check if local host or local/private IP
    is_local = False
    if domain in ("localhost", "127.0.0.1", "::1", "[::1]"):
        is_local = True
    else:
        # Check standard private/loopback IP ranges via ipaddress
        try:
            ip = ipaddress.ip_address(domain)
            if ip.is_private or ip.is_loopback:
                is_local = True
        except ValueError:
            # Fallback checks for string patterns just in case
            if (domain.startswith("127.") or 
                domain.startswith("192.168.") or 
                domain.startswith("10.")):
                parts = domain.split('.')
                if len(parts) == 4 and all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
                    is_local = True
    
    if is_local:
        clean_domain = "local_ip"
    else:
        # Replace dots and special characters with underscores to match google_com, example_com
        # Strip illegal characters, trim spaces/underscores
        clean_domain = re.sub(r'[^a-zA-Z0-9-]', '_', domain)
        clean_domain = re.sub(r'_+', '_', clean_domain).strip('_')
        
    if not clean_domain:
        clean_domain = "suspicious_url"
        
    return f"phishguard_report_{clean_domain}.{extension}"

def stream_and_close(stream: io.BytesIO):
    """
    Generator that yields chunks from the BytesIO stream and ensures
    the stream is closed safely after consumption.
    """
    try:
        while True:
            chunk = stream.read(8192)
            if not chunk:
                break
            yield chunk
    finally:
        stream.close()

@router.get("/export/pdf/{scan_id}")
def export_pdf(scan_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Export detailed report as a professional PDF.
    Verifies user ownership before generating.
    """
    scan_data = get_authorized_scan(scan_id, user_id)
    try:
        # Generate PDF bytes (finalized in-memory first)
        pdf_bytes = generate_pdf_report(scan_data)
        filename = get_sanitized_filename(scan_data.get("url", ""), "pdf")
        
        # Load into stream and reset pointer
        stream = io.BytesIO(pdf_bytes)
        stream.seek(0)
        
        return StreamingResponse(
            stream_and_close(stream),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        logger.exception("Failed to generate PDF export")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@router.get("/export/json/{scan_id}")
def export_json(scan_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Export detailed report as raw pretty JSON.
    Verifies user ownership before generating.
    """
    scan_data = get_authorized_scan(scan_id, user_id)
    try:
        json_str = generate_json_report(scan_data)
        filename = get_sanitized_filename(scan_data.get("url", ""), "json")
        
        # Load string into stream and reset pointer
        stream = io.BytesIO(json_str.encode("utf-8"))
        stream.seek(0)
        
        return StreamingResponse(
            stream_and_close(stream),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        logger.exception("Failed to generate JSON export")
        raise HTTPException(status_code=500, detail=f"JSON generation failed: {str(e)}")

@router.get("/export/txt/{scan_id}")
def export_txt(scan_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Export detailed report as structured plain-text.
    Verifies user ownership before generating.
    """
    scan_data = get_authorized_scan(scan_id, user_id)
    try:
        txt_str = generate_txt_report(scan_data)
        filename = get_sanitized_filename(scan_data.get("url", ""), "txt")
        
        # Load string into stream and reset pointer
        stream = io.BytesIO(txt_str.encode("utf-8"))
        stream.seek(0)
        
        return StreamingResponse(
            stream_and_close(stream),
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        logger.exception("Failed to generate TXT export")
        raise HTTPException(status_code=500, detail=f"TXT generation failed: {str(e)}")
