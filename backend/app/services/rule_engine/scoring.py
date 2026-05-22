from typing import List, Dict, Any, Tuple
from app.services.rule_engine import constants
from app.services.rule_engine import patterns
import urllib.parse

def calculate_threat_score(url: str) -> Tuple[int, List[str], Dict[str, Any]]:
    score = 0
    reasons = []
    
    parsed = urllib.parse.urlparse(url)
    domain = patterns.extract_domain(url)
    
    technical_details = {
        "https": parsed.scheme == "https",
        "domain": domain,
        "subdomain_count": patterns.count_subdomains(domain),
        "url_length": len(url),
        "contains_ip": patterns.is_ip_address(domain),
        "suspicious_keywords_found": [],
        "suspicious_tld": False,
        "redirect_pattern_detected": False,
        "url_shortener": False
    }

    # 1. Scheme Check
    if not technical_details["https"]:
        score += constants.WEIGHT_NO_HTTPS
        reasons.append("Unencrypted connection (HTTP).")

    # 2. IP Address Domain
    if technical_details["contains_ip"]:
        score += constants.WEIGHT_IP_ADDRESS
        reasons.append("Domain is an IP address, hiding real identity.")

    # 3. Suspicious Keywords
    found_keywords = patterns.find_suspicious_keywords(url, constants.SUSPICIOUS_KEYWORDS)
    if found_keywords:
        technical_details["suspicious_keywords_found"] = found_keywords
        score += (len(found_keywords) * constants.WEIGHT_SUSPICIOUS_KEYWORD)
        reasons.append(f"Found suspicious keywords: {', '.join(found_keywords)}.")

    # 4. URL Length
    if technical_details["url_length"] > constants.MAX_SAFE_URL_LENGTH:
        score += constants.WEIGHT_LONG_URL
        reasons.append("Excessively long URL often used to obscure targets.")

    # 5. Subdomain Count
    if technical_details["subdomain_count"] > constants.MAX_SAFE_SUBDOMAINS:
        score += constants.WEIGHT_MANY_SUBDOMAINS
        reasons.append(f"Excessive number of subdomains ({technical_details['subdomain_count']}).")

    # 6. Suspicious TLD
    if patterns.has_suspicious_tld(domain, constants.SUSPICIOUS_TLDS):
        technical_details["suspicious_tld"] = True
        score += constants.WEIGHT_SUSPICIOUS_TLD
        reasons.append("Top-level domain (TLD) is frequently abused.")

    # 7. URL Shorteners
    if patterns.is_url_shortener(domain, constants.URL_SHORTENERS):
        technical_details["url_shortener"] = True
        score += constants.WEIGHT_URL_SHORTENER
        reasons.append("URL shortener detected; real destination is hidden.")

    # 8. At Symbol (@) in URL
    if patterns.has_at_symbol(url):
        score += constants.WEIGHT_AT_SYMBOL
        reasons.append("Contains '@' symbol, often used for credential spoofing.")

    # 9. Double slash in path (redirect pattern)
    if patterns.has_double_slash_in_path(url):
        technical_details["redirect_pattern_detected"] = True
        score += constants.WEIGHT_DOUBLE_SLASH_PATH
        reasons.append("Double slash found in URL path; potential open redirect abuse.")

    # Create detailed scoring breakdown
    scoring_breakdown = []
    if not technical_details["https"]:
        scoring_breakdown.append({"rule": "Unencrypted connection (HTTP)", "points": constants.WEIGHT_NO_HTTPS})
    if technical_details["contains_ip"]:
        scoring_breakdown.append({"rule": "Domain is an IP address", "points": constants.WEIGHT_IP_ADDRESS})
    if found_keywords:
        scoring_breakdown.append({"rule": f"Suspicious keywords ({', '.join(found_keywords)})", "points": len(found_keywords) * constants.WEIGHT_SUSPICIOUS_KEYWORD})
    if technical_details["url_length"] > constants.MAX_SAFE_URL_LENGTH:
        scoring_breakdown.append({"rule": f"Excessively long URL ({technical_details['url_length']} chars)", "points": constants.WEIGHT_LONG_URL})
    if technical_details["subdomain_count"] > constants.MAX_SAFE_SUBDOMAINS:
        scoring_breakdown.append({"rule": f"Excessive subdomains ({technical_details['subdomain_count']} count)", "points": constants.WEIGHT_MANY_SUBDOMAINS})
    if technical_details["suspicious_tld"]:
        scoring_breakdown.append({"rule": f"Abused Top-Level Domain ({urllib.parse.urlparse(url).netloc.split('.')[-1]})", "points": constants.WEIGHT_SUSPICIOUS_TLD})
    if technical_details["url_shortener"]:
        scoring_breakdown.append({"rule": "Obscured URL shortener", "points": constants.WEIGHT_URL_SHORTENER})
    if patterns.has_at_symbol(url):
        scoring_breakdown.append({"rule": "Credential obfuscation (@ symbol)", "points": constants.WEIGHT_AT_SYMBOL})
    if technical_details["redirect_pattern_detected"]:
        scoring_breakdown.append({"rule": "Redirection pattern (// in path)", "points": constants.WEIGHT_DOUBLE_SLASH_PATH})

    technical_details["scoring_breakdown"] = scoring_breakdown

    # Cap score at 100
    score = min(score, 100)

    return score, reasons, technical_details

def classify_score(score: int) -> str:
    if score <= constants.SCORE_SAFE_MAX:
        return "SAFE"
    elif score <= constants.SCORE_SUSPICIOUS_MAX:
        return "SUSPICIOUS"
    else:
        return "DANGEROUS"

