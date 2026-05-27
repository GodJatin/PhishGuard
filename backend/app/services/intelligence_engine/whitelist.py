from app.services.intelligence_engine.datasets import WHITELIST_DOMAINS

def normalize_domain_name(domain: str) -> str:
    """
    Normalizes a domain name:
    - Strips whitespace
    - Converts to lowercase
    - Normalizes punycode
    - Strips trailing slash / dots
    - Removes www. prefix
    """
    if not domain:
        return ""
    
    domain = domain.strip().lower().rstrip('/')
    
    # Strip leading www.
    if domain.startswith("www."):
        domain = domain[4:]
        
    # Punycode normalization safely
    try:
        domain = domain.encode('idna').decode('ascii')
    except Exception:
        pass
        
    return domain

def check_whitelist(domain: str) -> dict:
    """
    Checks if a domain is whitelisted.
    Supports exact match and subdomain match.
    """
    normalized = normalize_domain_name(domain)
    if not normalized:
        return {"is_whitelisted": False, "reason": ""}
        
    # 1. Exact match
    if normalized in WHITELIST_DOMAINS:
        return {
            "is_whitelisted": True,
            "reason": f"Domain is in the verified safe list ({normalized})."
        }
        
    # 2. Subdomain match (e.g., mail.google.com -> google.com is whitelisted)
    for white_dom in WHITELIST_DOMAINS:
        if normalized.endswith("." + white_dom):
            return {
                "is_whitelisted": True,
                "reason": f"Subdomain of a verified safe domain ({white_dom})."
            }
            
    return {"is_whitelisted": False, "reason": ""}
