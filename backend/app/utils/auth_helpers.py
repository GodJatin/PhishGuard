import logging
from typing import Optional
from fastapi import Header, HTTPException
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    Dependency to validate JWT from the Authorization header and return the user ID.
    Raises 401 Unauthorized if token is missing, invalid, or expired.
    """
    if not authorization or not authorization.startswith("Bearer "):
        logger.warning("Missing or invalid Authorization header format.")
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid authentication token. Must be a Bearer token."
        )
    
    token = authorization.split(" ")[1]
    try:
        user_resp = supabase.auth.get_user(token)
        if user_resp and user_resp.user:
            user_id = user_resp.user.id
            logger.info("Successfully authenticated user: %s", user_id)
            return user_id
        else:
            logger.warning("get_user did not return a valid user.")
            raise HTTPException(
                status_code=401,
                detail="Invalid token or session expired."
            )
    except Exception as e:
        logger.exception("Supabase JWT validation failed.")
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )

def get_authorized_scan(scan_id: str, user_id: str) -> dict:
    """
    Fetches the scan and validates that it exists and is owned by the user.
    Raises 404 if not found, 403 if owned by another user.
    """
    if not scan_id:
        raise HTTPException(status_code=400, detail="Invalid scan ID")
        
    try:
        # Fetch the scan using parameterized equal filter (safe query)
        result = supabase.table("scans").select("*").eq("id", scan_id).execute()
        if not result.data:
            logger.warning("Scan ID %s not found in database.", scan_id)
            raise HTTPException(status_code=404, detail="Scan report not found")
        
        scan = result.data[0]
        
        # Verify ownership
        if scan.get("user_id") != user_id:
            logger.warning("User %s attempted unauthorized access to scan %s owned by %s.", 
                           user_id, scan_id, scan.get("user_id"))
            raise HTTPException(
                status_code=403,
                detail="Access denied. You do not own this scan report."
            )
            
        return scan
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Database query failed while fetching scan %s", scan_id)
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )
