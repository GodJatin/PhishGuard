from app.services.intelligence_engine.whitelist import check_whitelist
from app.services.intelligence_engine.blacklist import check_blacklist

def assess_reputation(url: str, domain: str) -> dict:
    """
    Orchestrates whitelist and blacklist checks.
    Returns:
        is_whitelisted (bool)
        whitelist_reason (str)
        is_blacklisted (bool)
        blacklist_source (str)
        blacklist_indicator (str)
        reputation_score_delta (int)
        score_floor (int)
    """
    whitelist_res = check_whitelist(domain)
    blacklist_res = check_blacklist(domain, url)
    
    is_whitelisted = whitelist_res["is_whitelisted"]
    whitelist_reason = whitelist_res["reason"]
    
    is_blacklisted = blacklist_res["is_blacklisted"]
    blacklist_source = blacklist_res["source"]
    blacklist_indicator = blacklist_res["indicator"]
    
    reputation_score_delta = 0
    score_floor = 0
    
    if is_whitelisted:
        # Whitelist lowers risk moderately
        reputation_score_delta = -35
        
    if is_blacklisted:
        # Blacklist adds strong score floor
        score_floor = 85
        reputation_score_delta = 45
        
    return {
        "is_whitelisted": is_whitelisted,
        "whitelist_reason": whitelist_reason,
        "is_blacklisted": is_blacklisted,
        "blacklist_source": blacklist_source,
        "blacklist_indicator": blacklist_indicator,
        "reputation_score_delta": reputation_score_delta,
        "score_floor": score_floor
    }

