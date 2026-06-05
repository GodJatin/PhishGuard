import logging
from typing import Dict, Any, List
from urllib.parse import urlparse
from datetime import datetime, timezone
import concurrent.futures

from app.core.config import settings
from supabase import create_client, Client

from .openphish import OpenPhishProvider
from .phishtank import PhishTankProvider
from .urlhaus import URLHausProvider

logger = logging.getLogger(__name__)

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

PROVIDERS = [
    OpenPhishProvider(),
    PhishTankProvider(),
    URLHausProvider()
]

def normalize_url_for_cache(url: str) -> str:
    """
    Normalizes a URL so that http://example.com, https://example.com, 
    and https://example.com/ all resolve to 'example.com'.
    """
    url = url.strip().lower()
    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'http://' + url
    
    parsed = urlparse(url)
    netloc = parsed.netloc
    path = parsed.path if parsed.path else "/"
    
    normalized = netloc + path
    if normalized.endswith('/'):
        normalized = normalized[:-1]
        
    return normalized if normalized else url

def sync_provider(provider) -> int:
    """
    Syncs a single provider. Designed to be run in a thread pool.
    """
    try:
        logger.info(f"Starting sync for {provider.SOURCE_NAME}...")
        raw_data = provider.fetch_intelligence()
        if not raw_data:
            logger.warning(f"No data returned for {provider.SOURCE_NAME}. Skipping DB update.")
            return 0
            
        logger.info(f"{provider.SOURCE_NAME}: Feed download success. Downloaded record count: {len(raw_data)}")
            
        # Normalize URLs
        db_records = []
        now = datetime.now(timezone.utc).isoformat()
        
        # Deduplicate by normalized URL within the same provider feed
        seen = set()
        for item in raw_data:
            norm_url = normalize_url_for_cache(item["url"])
            if norm_url not in seen:
                seen.add(norm_url)
                db_records.append({
                    "url": norm_url,
                    "source": item["source"],
                    "confidence": item["confidence"],
                    "category": item["category"],
                    "created_at": now
                })
                
        logger.info(f"{provider.SOURCE_NAME}: Parsed record count after deduplication: {len(db_records)}")
        
        # Safe Truncate and Replace to avoid UPSERT constraint guessing
        logger.info(f"Deleting old cache for {provider.SOURCE_NAME}...")
        supabase.table("threat_feed_cache").delete().eq("source", provider.SOURCE_NAME).execute()
        
        # Insert in chunks of 1000 to prevent payload too large errors
        chunk_size = 1000
        inserted_count = 0
        batch_count = 0
        for i in range(0, len(db_records), chunk_size):
            chunk = db_records[i:i+chunk_size]
            res = supabase.table("threat_feed_cache").insert(chunk).execute()
            inserted_count += len(chunk)
            batch_count += 1
            logger.info(f"{provider.SOURCE_NAME}: Supabase insert response for batch {batch_count}: Inserted {len(res.data)} records")
            
        logger.info(f"{provider.SOURCE_NAME}: Successfully synced {inserted_count} records across {batch_count} batches.")
        return inserted_count
    except Exception as e:
        logger.exception(f"{provider.SOURCE_NAME}: Exception details during sync: {e}")
        return 0

def sync_feeds():
    """
    Coordinates the synchronization of all threat feeds into the Supabase cache.
    Runs concurrently.
    """
    logger.info("Starting global Threat Feed synchronization...")
    total_inserted = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(sync_provider, p): p for p in PROVIDERS}
        for future in concurrent.futures.as_completed(futures):
            total_inserted += future.result()
            
    logger.info(f"Global Threat Feed synchronization complete. Total records updated: {total_inserted}")

def check_threat_feeds(url: str) -> Dict[str, Any]:
    """
    Checks the local Supabase cache for threat feed matches.
    Does NOT perform live external API calls.
    """
    norm_url = normalize_url_for_cache(url)
    
    result = {
        "openphish_match": False,
        "phishtank_match": False,
        "urlhaus_match": False,
        "matched_sources": [],
        "confidence": "None",
        "cache_count": 0,
        "last_sync": "Unknown"
    }
    
    try:
        # Fetch cache health metrics (Phase 6.5)
        count_res = supabase.table("threat_feed_cache").select("id", count="exact", head=True).execute()
        result["cache_count"] = count_res.count if hasattr(count_res, "count") and count_res.count is not None else 0
        
        sync_res = supabase.table("threat_feed_cache").select("created_at").order("created_at", desc=True).limit(1).execute()
        if sync_res.data and len(sync_res.data) > 0:
            result["last_sync"] = sync_res.data[0].get("created_at", "Unknown")

        # Fast targeted lookup
        response = supabase.table("threat_feed_cache").select("*").eq("url", norm_url).execute()
        data = response.data
        
        if data:
            for match in data:
                source = match.get("source")
                if source == "OpenPhish":
                    result["openphish_match"] = True
                elif source == "PhishTank":
                    result["phishtank_match"] = True
                elif source == "URLHaus":
                    result["urlhaus_match"] = True
                    
                if source not in result["matched_sources"]:
                    result["matched_sources"].append(source)
                    
            result["confidence"] = data[0].get("confidence", "High")
            logger.info(f"Threat Feed Match found for {norm_url}: {result['matched_sources']}")
    except Exception as e:
        logger.exception(f"Error querying threat_feed_cache for {norm_url}: {e}")
        # Return safely on failure so scanning never stops
        
    return result
