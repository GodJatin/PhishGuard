import time
import requests
import whois
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Lightweight Cache for Domain Age Intelligence
# format: { "domain.com": { "data": dict, "expiry": float } }
_DOMAIN_AGE_CACHE = {}
CACHE_TTL_SECONDS = 24 * 60 * 60  # 24 hours

_RDAP_BOOTSTRAP_CACHE = None
_RDAP_BOOTSTRAP_EXPIRY = 0

def _get_rdap_bootstrap():
    global _RDAP_BOOTSTRAP_CACHE, _RDAP_BOOTSTRAP_EXPIRY
    now = time.time()
    if _RDAP_BOOTSTRAP_CACHE and now < _RDAP_BOOTSTRAP_EXPIRY:
        return _RDAP_BOOTSTRAP_CACHE
    
    try:
        res = requests.get("https://data.iana.org/rdap/dns.json", timeout=5)
        if res.status_code == 200:
            data = res.json()
            tlds = {}
            for service in data.get("services", []):
                endpoints = service[1]
                if endpoints:
                    endpoint = endpoints[0]
                    for tld in service[0]:
                        tlds[tld] = endpoint
            _RDAP_BOOTSTRAP_CACHE = tlds
            _RDAP_BOOTSTRAP_EXPIRY = now + (7 * 24 * 60 * 60) # 1 week
            return tlds
    except Exception as e:
        logger.warning(f"Failed to fetch IANA RDAP bootstrap: {e}")
    return {}

def _get_rdap_endpoint_for_tld(tld: str) -> str:
    # Common fallbacks if bootstrap fails
    common = {
        "com": "https://rdap.verisign.com/com/v1/",
        "net": "https://rdap.verisign.com/net/v1/",
        "org": "https://rdap.publicinterestregistry.net/rdap/org/v1/",
        "io": "https://rdap.identitydigital.services/rdap/",
        "co": "https://rdap.nominet.uk/co/",
    }
    bootstrap = _get_rdap_bootstrap()
    if bootstrap and tld in bootstrap:
        return bootstrap[tld]
    return common.get(tld)

def _query_rdap(domain: str):
    parts = domain.split(".")
    if len(parts) < 2:
        return None
    tld = parts[-1]
    base_url = _get_rdap_endpoint_for_tld(tld)
    if not base_url:
        return None
        
    endpoint = f"{base_url}domain/{domain}"
    try:
        res = requests.get(endpoint, timeout=4)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        logger.warning(f"RDAP lookup failed for {domain} at {endpoint}: {e}")
    return None

def _parse_rdap_response(data: dict):
    # Parse registrar
    registrar = "Unknown"
    for ent in data.get("entities", []):
        if "registrar" in ent.get("roles", []):
            vcard = ent.get("vcardArray", [])
            if len(vcard) > 1:
                for item in vcard[1]:
                    if item[0] == "fn":
                        registrar = item[3]
                        break
            break
            
    # Parse creation date
    created_date = None
    for ev in data.get("events", []):
        if ev.get("eventAction") == "registration":
            created_date = ev.get("eventDate")
            break
            
    if not created_date:
        return None
        
    try:
        # RDAP typically returns "1997-09-15T04:00:00Z"
        # Extract until the + or Z part and append +0000
        clean_date = created_date.replace("Z", "+0000")
        if "." in clean_date:
            clean_date = clean_date.split(".")[0] + clean_date[-5:] if "+" in clean_date else clean_date.split(".")[0] + "+0000"
        
        # simplified parsing
        # Some registries return different formats. 
        # python fromisoformat handles most Python 3.11+
        created_dt = datetime.fromisoformat(created_date.replace('Z', '+00:00'))
        
        age_days = (datetime.now(timezone.utc) - created_dt).days
        return {
            "created_date": created_dt.strftime("%Y-%m-%d"),
            "domain_age_days": max(0, age_days),
            "registrar": registrar
        }
    except Exception as e:
        logger.warning(f"Failed to parse RDAP date '{created_date}': {e}")
        return None

def _query_whois(domain: str):
    try:
        w = whois.whois(domain)
        # If no domain name is returned, it's highly likely unregistered
        if not w.domain_name:
            return {
                "created_date": "Unregistered",
                "domain_age_days": -1,
                "registrar": "None"
            }
            
        # creation_date can be a list or a single datetime
        created_dt = w.creation_date
        if isinstance(created_dt, list):
            created_dt = created_dt[0]
            
        registrar = w.registrar or "Unknown"
        if isinstance(registrar, list):
            registrar = registrar[0]
        
        if created_dt:
            if created_dt.tzinfo is None:
                created_dt = created_dt.replace(tzinfo=timezone.utc)
            age_days = (datetime.now(timezone.utc) - created_dt).days
            return {
                "created_date": created_dt.strftime("%Y-%m-%d"),
                "domain_age_days": max(0, age_days),
                "registrar": registrar
            }
    except Exception as e:
        logger.warning(f"WHOIS lookup failed for {domain}: {e}")
    return None

def assess_domain_age(domain: str) -> dict:
    """
    Returns domain intelligence dictionary or None.
    Uses caching.
    """
    now = time.time()
    cached = _DOMAIN_AGE_CACHE.get(domain)
    if cached and now < cached["expiry"]:
        return cached["data"]
        
    result = None
    
    # Try RDAP
    rdap_data = _query_rdap(domain)
    if rdap_data:
        result = _parse_rdap_response(rdap_data)
        
    # Fallback to WHOIS
    if not result:
        result = _query_whois(domain)
        
    if result:
        if result.get("domain_age_days") == -1:
            result["status"] = "unregistered"
        else:
            result["status"] = "success"
            
        _DOMAIN_AGE_CACHE[domain] = {
            "data": result,
            "expiry": now + CACHE_TTL_SECONDS
        }
    else:
        result = {
            "status": "failed",
            "reason": "RDAP/WHOIS Failure",
            "domain_age_days": None,
            "registrar": None,
            "created_date": None
        }
        
    return result

def calculate_domain_age_score(age_days: int) -> int:
    if age_days == -1: return 20  # Unregistered domains get a suspicious signal
    if age_days <= 7: return 25
    if age_days <= 30: return 15
    if age_days <= 90: return 10
    if age_days <= 365: return 5
    return 0
