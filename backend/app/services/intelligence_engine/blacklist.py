import re
import urllib.parse
from app.services.intelligence_engine.datasets import BLACKLIST_DOMAINS, BLACKLIST_PATTERNS
from app.services.intelligence_engine.whitelist import normalize_domain_name

def check_blacklist(domain: str, url: str) -> dict:
    """
    Checks if a URL or domain is blacklisted.
    Supports exact domain match, subdomain match, and path pattern match.
    """
    normalized_domain = normalize_domain_name(domain)
    if not normalized_domain:
        return {"is_blacklisted": False, "source": "", "indicator": ""}

    # 1. Exact domain match in O(1)
    if normalized_domain in BLACKLIST_DOMAINS:
        return {
            "is_blacklisted": True,
            "source": "PhishGuard Threat Intelligence Feed (Static)",
            "indicator": f"Exact domain match: {normalized_domain}"
        }

    # 2. Subdomain match (e.g. login.phishing.com matches phishing.com)
    # To keep it O(1) on average or very fast, we check suffixes of normalized_domain
    parts = normalized_domain.split('.')
    # Check if any parent domain suffix matches
    # e.g., for login.phishing.com -> checking phishing.com, com
    for i in range(1, len(parts)):
        parent_domain = '.'.join(parts[i:])
        if parent_domain in BLACKLIST_DOMAINS:
            return {
                "is_blacklisted": True,
                "source": "PhishGuard Threat Intelligence Feed (Static)",
                "indicator": f"Subdomain of blacklisted domain: {parent_domain}"
            }

    # 3. Path pattern match
    parsed = urllib.parse.urlparse(url)
    path = parsed.path
    path_with_query = path
    if parsed.query:
        path_with_query = f"{path}?{parsed.query}"

    for pattern in BLACKLIST_PATTERNS:
        if re.search(pattern, path_with_query, re.IGNORECASE):
            return {
                "is_blacklisted": True,
                "source": "PhishGuard Threat Intelligence Feed (Heuristics)",
                "indicator": f"Path matched blacklisted pattern: {pattern}"
            }

    return {"is_blacklisted": False, "source": "", "indicator": ""}
