from typing import List, Dict, Any

def generate_recommendation(
    status: str,
    score: int,
    reasons: List[str],
    technical_details: Dict[str, Any]
) -> str:
    """
    Generates a dynamic, contextual, and highly actionable security recommendation
    based on the specific indicators flagged during analysis.
    
    If multiple indicators are present, the highest-risk threats are prioritized
    to avoid overwhelming the user with excessive text.
    """
    status_upper = status.upper()
    
    # 1. Handle SAFE status
    if status_upper == "SAFE":
        https = technical_details.get("https", True)
        if not https:
            return "Missing HTTPS encryption. Avoid transmitting sensitive credentials or personal data over this connection."
        return "No immediate threats or spoofing signatures detected. Make sure the domain name matches the expected brand before entering any credentials."

    # 2. Extract technical indicators
    has_ip = technical_details.get("contains_ip", False)
    has_no_https = not technical_details.get("https", True)
    keywords_found = technical_details.get("suspicious_keywords_found", [])
    subdomain_count = technical_details.get("subdomain_count", 0)
    suspicious_tld = technical_details.get("suspicious_tld", False)
    redirect_pattern = technical_details.get("redirect_pattern_detected", False) or technical_details.get("redirect_pattern", False)
    at_symbol = technical_details.get("at_symbol", False)
    encoded_chars = technical_details.get("encoded_char_presence", False)
    url_length = technical_details.get("url_length", 0)

    # 3. Collect active vulnerability details
    bullet_points = []
    
    if has_ip:
        bullet_points.append("uses a raw IP address instead of a trusted domain")
    if has_no_https:
        bullet_points.append("lacks HTTPS encryption")
    if keywords_found:
        kws = ", ".join(f"'{k}'" for k in keywords_found[:2])
        bullet_points.append(f"contains deceptive keywords ({kws})")
    if subdomain_count >= 3:
        bullet_points.append("exhibits excessive subdomain nesting")
    if suspicious_tld:
        bullet_points.append("is hosted on a top-level domain frequently used for attacks")
    if redirect_pattern:
        bullet_points.append("contains suspicious redirection characters")
    if at_symbol:
        bullet_points.append("uses character masking (@ symbol)")
    if encoded_chars:
        bullet_points.append("features obfuscated encoding patterns")

    # 4. Fallback if no specific indicator was mapped
    if not bullet_points:
        if status_upper == "SUSPICIOUS":
            return "Proceed with caution. The URL exhibits minor structural anomalies. Verify the sender's source before submitting information."
        else:
            return "Do not visit this URL. The link exhibits high-risk patterns consistent with active phishing campaigns."

    # 5. Format recommendation by prioritizing high-risk indicators
    # We choose the top 2 indicators to remain concise
    active_indicators = bullet_points[:2]
    if len(active_indicators) == 1:
        indicator_clause = f"it {active_indicators[0]}"
    else:
        indicator_clause = f"it {active_indicators[0]} and {active_indicators[1]}"

    if status_upper == "SUSPICIOUS":
        return f"Proceed with caution. Because {indicator_clause}, it is highly recommended to verify the identity of the sender independently before entering credentials."
    else:
        # DANGEROUS status
        return f"Do not visit this URL. Because {indicator_clause}, entering passwords or credit card details here puts your security at high risk of credential theft."
