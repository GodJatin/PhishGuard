import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from app.utils.auth_helpers import get_current_user_id
from app.core.config import settings
from supabase import create_client, Client

from app.services.analytics_engine.overview import calculate_overview
from app.services.analytics_engine.trends import calculate_trends
from app.services.analytics_engine.keywords import calculate_keywords

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

@router.get("/overview", response_model=Dict[str, Any])
def get_overview(user_id: str = Depends(get_current_user_id)):
    """
    Retrieves summary stats and high-level insights for the authenticated user's scans.
    """
    try:
        logger.info("Fetching scan overview for user_id: %s", user_id)
        result = supabase.table("scans").select(
            "status, scan_type, score, created_at, reasons, technical_details"
        ).eq("user_id", user_id).execute()
        
        scans = result.data or []
        overview_stats = calculate_overview(scans)
        return overview_stats
    except Exception as e:
        logger.exception("Error generating analytics overview for user %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to fetch overview analytics.")

@router.get("/trends", response_model=List[Dict[str, Any]])
def get_trends(user_id: str = Depends(get_current_user_id)):
    """
    Retrieves a zero-padded, chronological 7-day timeline of scan counts by status.
    """
    try:
        logger.info("Fetching scan trends for user_id: %s", user_id)
        result = supabase.table("scans").select(
            "status, created_at"
        ).eq("user_id", user_id).execute()
        
        scans = result.data or []
        trends_data = calculate_trends(scans)
        return trends_data
    except Exception as e:
        logger.exception("Error generating analytics trends for user %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to fetch trends analytics.")

@router.get("/keywords", response_model=Dict[str, Any])
def get_keywords(user_id: str = Depends(get_current_user_id)):
    """
    Retrieves top suspicious keywords and common indicators/reasons.
    """
    try:
        logger.info("Fetching keywords and indicators for user_id: %s", user_id)
        result = supabase.table("scans").select(
            "reasons, technical_details"
        ).eq("user_id", user_id).execute()
        
        scans = result.data or []
        keywords_data = calculate_keywords(scans)
        return keywords_data
    except Exception as e:
        logger.exception("Error generating keywords analytics for user %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to fetch keywords analytics.")

@router.get("/recent-threats", response_model=List[Dict[str, Any]])
def get_recent_threats(user_id: str = Depends(get_current_user_id)):
    """
    Retrieves the 10 latest suspicious or dangerous scans for the user.
    """
    try:
        logger.info("Fetching recent threats for user_id: %s", user_id)
        # Query database directly for suspicious/dangerous scans, sorting descending by created_at.
        # Limits to 10 entries to maintain performance.
        result = supabase.table("scans").select(
            "id, url, status, score, scan_type, created_at"
        ).eq("user_id", user_id).in_("status", ["suspicious", "dangerous"]).order(
            "created_at", desc=True
        ).limit(10).execute()
        
        return result.data or []
    except Exception as e:
        logger.exception("Error fetching recent threats for user %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to fetch recent threats.")
