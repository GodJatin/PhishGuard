from typing import List, Dict, Any

def generate_recommendation(
    final_verdict: str,
    score: int,
    reasons: List[str],
    technical_details: Dict[str, Any]
) -> str:
    """
    Generates a dynamic, contextual, and highly actionable security recommendation
    based directly on the Final Verdict and intelligence signals.
    """
    verdict = final_verdict.upper() if final_verdict else "SUSPICIOUS"

    # Base string from Final Verdict
    if verdict == "SAFE":
        base_rec = "Safe to visit."
        https = technical_details.get("https", True)
        if not https:
            base_rec += " However, missing HTTPS encryption means you should avoid transmitting sensitive credentials."
    elif verdict == "SUSPICIOUS":
        base_rec = "Exercise caution."
    elif verdict == "HIGH RISK":
        base_rec = "Do not enter credentials. Verify legitimacy independently."
    elif verdict == "CRITICAL":
        base_rec = "Avoid interaction. Potential phishing activity detected."
    elif verdict == "MALICIOUS":
        base_rec = "Do not visit. Known malicious infrastructure identified."
    else:
        base_rec = "Exercise caution."

    # Contextual Brand Additions
    brand_spoof_detected = technical_details.get("brand_spoof_detected", False)
    suspected_brand = technical_details.get("suspected_brand", "")
    
    if brand_spoof_detected and suspected_brand:
        b_lower = suspected_brand.lower()
        if b_lower == "paypal":
            return "Do not enter credentials or payment information. Verify legitimacy through the official PayPal website. Avoid links received through emails, SMS messages, or social platforms."
        elif b_lower == "microsoft":
            return f"{base_rec} Use the official Microsoft portal for account verification."
        elif b_lower == "google":
            return f"{base_rec} Use the official Google account recovery page."
        elif b_lower in ("chase", "bank of america", "wells fargo", "citibank", "stripe", "coinbase", "binance", "metamask", "americanexpress", "discover"):
            return f"{base_rec} Verify legitimacy through official vendor channels."
        else:
            return f"{base_rec} Verify legitimacy of this {suspected_brand} link through official channels."

    # Extract technical indicators for structural context (if no brand spoof)
    has_ip = technical_details.get("contains_ip", False)
    redirect_pattern = technical_details.get("redirect_pattern_detected", False) or technical_details.get("redirect_pattern", False)
    
    if verdict in ("SUSPICIOUS", "HIGH RISK", "CRITICAL", "MALICIOUS"):
        if has_ip:
            return f"{base_rec} The URL uses a raw IP address instead of a trusted domain."
        if redirect_pattern:
            return f"{base_rec} The URL contains suspicious redirection patterns."

    return base_rec
