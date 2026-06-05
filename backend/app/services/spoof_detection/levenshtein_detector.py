import re
from app.services.spoof_detection.brand_dataset import PROTECTED_BRANDS
from app.services.spoof_detection.homoglyph_detector import normalize_homoglyphs

def levenshtein_distance(s1: str, s2: str) -> int:
    """
    Computes the Levenshtein distance between two strings using O(min(m, n)) space.
    """
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]

def extract_bare_domain(domain: str) -> str:
    """
    Strips TLDs and subdomains to extract the registrable second-level domain name.
    e.g. login.paypal-security.co.uk -> paypal-security
    """
    domain = domain.lower().strip().rstrip('.')
    if domain.startswith("www."):
        domain = domain[4:]
        
    parts = domain.split('.')
    if len(parts) >= 3:
        # Check for common two-part TLDs (e.g. co.uk, com.br)
        last_two = f"{parts[-2]}.{parts[-1]}"
        double_tlds = {
            "co.uk", "com.br", "org.uk", "net.au", "com.au", 
            "co.jp", "com.cn", "gov.uk", "ac.uk", "com.tw", "org.cn"
        }
        if last_two in double_tlds:
            return parts[-3]
            
    if len(parts) >= 2:
        return parts[-2]
        
    return domain

def contains_keyword_safely(candidate: str, keyword: str) -> bool:
    """
    Checks if a candidate domain name contains a brand keyword.
    Uses boundary rules for short keywords to prevent false positives (e.g. ups in backup).
    """
    if keyword not in candidate:
        return False
        
    # For very short keywords (<= 3 chars like ups, aws, citi), enforce delimiter or start/end boundary
    if len(keyword) <= 3:
        pattern = re.compile(rf"(^|[^a-z0-9]){keyword}([^a-z0-9]|$)|({keyword}-)|(-{keyword})")
        return bool(pattern.search(candidate))
        
    return True

def check_brand_spoof(domain: str) -> dict:
    """
    Checks if a domain name is impersonating/spoofing any protected brand.
    Returns:
        is_spoofed (bool)
        suspected_brand (str)
        similarity_score (float)
        spoof_type (str) - "homoglyph" | "typosquat" | "keyword_imitation" | ""
        explanation (str)
    """
    # Normalize domain name, preserving case for homoglyph mapping
    domain_orig = domain.strip()
    if domain_orig.lower().startswith("www."):
        domain_orig = domain_orig[4:]
        
    domain_lower = domain_orig.lower()
        
    for brand in PROTECTED_BRANDS:
        # 1. Check if the domain is a legitimate official domain for the brand
        # e.g., secure.paypal.com or paypal.com
        is_legitimate = False
        for official_dom in brand["domains"]:
            if domain_lower == official_dom or domain_lower.endswith("." + official_dom):
                is_legitimate = True
                break
        if is_legitimate:
            continue
            
        # 2. Extract bare domain name (e.g., paypal-verify -> paypal-verify, paypa1.com -> paypa1)
        bare_candidate_orig = extract_bare_domain(domain_orig)
        bare_candidate_lower = bare_candidate_orig.lower()
        normalized_bare_candidate = normalize_homoglyphs(bare_candidate_orig)
        
        # Check official bare domains
        for official_dom in brand["domains"]:
            bare_official = extract_bare_domain(official_dom)
            normalized_bare_official = normalize_homoglyphs(bare_official)
            
            # A. Homoglyph check: if normalized bare domains match exactly but original didn't
            if normalized_bare_candidate == normalized_bare_official and bare_candidate_lower != bare_official:
                return {
                    "is_spoofed": True,
                    "suspected_brand": brand["name"],
                    "similarity_score": 100.0,
                    "spoof_type": "homoglyph",
                    "explanation": f"Suspected homoglyph attack impersonating {brand['name']}. Visually similar characters detected (e.g., {bare_candidate_orig} vs {bare_official})."
                }
                
            # B. Typosquatting check via Levenshtein distance
            # E.g., paypa1 vs paypal (dist 1), paypaal vs paypal (dist 1)
            dist = levenshtein_distance(bare_candidate_lower, bare_official)
            max_len = max(len(bare_candidate_lower), len(bare_official))
            similarity = (1.0 - (dist / max_len)) * 100 if max_len > 0 else 0
            
            # We tune threshold: edit distance of 1 or 2, and similarity >= 75%
            # Also ensure candidate is not too short to avoid accidental matches
            if 0 < dist <= 2 and similarity >= 75.0 and len(bare_candidate_lower) >= 4:
                return {
                    "is_spoofed": True,
                    "suspected_brand": brand["name"],
                    "similarity_score": round(similarity, 1),
                    "spoof_type": "typosquat",
                    "explanation": f"Suspected typosquatting impersonating {brand['name']}. Domain name is highly similar ({round(similarity, 1)}% match) to the official domain."
                }
                
        # C. Keyword imitation check
        # E.g., secure-paypal-alert.com contains keyword 'paypal'
        for keyword in brand["keywords"]:
            normalized_kw = normalize_homoglyphs(keyword)
            if contains_keyword_safely(normalized_bare_candidate, normalized_kw):
                return {
                    "is_spoofed": True,
                    "suspected_brand": brand["name"],
                    "similarity_score": 90.0,
                    "spoof_type": "keyword_imitation",
                    "explanation": f"Suspected brand impersonation of {brand['name']}. Contains brand trademark keyword '{keyword}' in a deceptive context."
                }
                
    return {
        "is_spoofed": False,
        "suspected_brand": "",
        "similarity_score": 0.0,
        "spoof_type": "",
        "explanation": ""
    }
