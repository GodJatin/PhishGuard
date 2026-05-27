from typing import List, Dict, Any, Tuple

def determine_category_and_tags(score: int, details: dict, reasons: List[str]) -> Tuple[str, List[str]]:
    """
    Classifies a scan into a single primary threat category based on hierarchical risk rules
    and lists secondary tags.
    """
    # If score is very low, mark as Safe
    if score <= 20:
        return "Safe Domain", ["Verified Clean" if details.get("is_whitelisted") else "Heuristics OK"]
        
    is_blacklisted = details.get("is_blacklisted", False)
    brand_spoof_detected = details.get("brand_spoof_detected", False)
    suspected_brand = details.get("suspected_brand", "")
    
    # Combined textual representation for indicator scanning
    reasons_text = " ".join(reasons).lower()
    domain = details.get("domain", "").lower()
    
    tags = []
    
    # 1. Financial Fraud Flags
    is_financial_brand = False
    if brand_spoof_detected and suspected_brand.lower() in (
        "paypal", "chase", "bank of america", "wells fargo", "citibank", 
        "stripe", "coinbase", "binance", "metamask", "americanexpress", "discover"
    ):
        is_financial_brand = True
    
    is_financial = is_financial_brand or any(k in reasons_text for k in (
        "bank", "paypal", "chase", "card", "billing", "payment", "invoice", "refund", "tax"
    ))
    
    # 2. Credential Theft Flags
    is_cred_theft = any(k in reasons_text or k in domain for k in (
        "login", "signin", "password", "credential", "auth", "sign-in", "log-in", "signin.php", "login.php"
    ))
    
    # 3. Brand Spoofing Flags
    is_brand_spoof = brand_spoof_detected
    
    # 4. Malware Delivery Flags
    is_malware = any(k in reasons_text for k in (
        "shell", "cmd", "exe", "apk", "download", "zip", "pdf", "install", "cmd.php", "shell.php"
    ))
    
    # 5. Account Verification Scam Flags
    is_verification_scam = any(k in reasons_text for k in (
        "verify", "verification", "restore", "update", "verify-account", "profile", "confirm"
    ))
    
    # 6. URL Obfuscation Flags
    is_obfuscation = details.get("contains_ip", False) or details.get("subdomain_count", 0) > 2 or details.get("encoded_char_presence", False) or "%" in reasons_text
    
    # 7. Suspicious Redirect Flags
    is_redirect = details.get("redirect_pattern_detected", False) or "redirect" in reasons_text or "//" in reasons_text
    
    # 8. Admin Panel Abuse Flags
    is_admin_abuse = any(k in reasons_text for k in ("wp-admin", "phpmyadmin", "wp-login", "cpanel"))
    
    # Build tag list
    if is_financial: tags.append("Financial Sector")
    if is_cred_theft: tags.append("Credential Harvesting")
    if is_brand_spoof: tags.append("Brand Mimicry")
    if is_malware: tags.append("Potential Payload")
    if is_verification_scam: tags.append("Security Alert Theme")
    if is_obfuscation: tags.append("Obfuscation Techniques")
    if is_redirect: tags.append("Redirect Tactics")
    if is_admin_abuse: tags.append("Privilege Escalation Target")
    
    # Apply category priority order
    if is_financial and (brand_spoof_detected or is_blacklisted or score >= 70):
        primary = "Financial Fraud"
    elif is_cred_theft:
        primary = "Credential Theft"
    elif is_brand_spoof:
        primary = "Brand Spoofing"
    elif is_malware:
        primary = "Malware Delivery"
    elif is_verification_scam:
        primary = "Account Verification Scam"
    elif is_obfuscation:
        primary = "URL Obfuscation"
    elif is_redirect:
        primary = "Suspicious Redirect"
    elif is_admin_abuse:
        primary = "Admin Panel Abuse"
    else:
        primary = "Generic Phishing Attempt"
        
    # Map primary to label to avoid repeating it as secondary tag
    primary_label_map = {
        "Financial Fraud": "Financial Sector",
        "Credential Theft": "Credential Harvesting",
        "Brand Spoofing": "Brand Mimicry",
        "Malware Delivery": "Potential Payload",
        "Account Verification Scam": "Security Alert Theme",
        "URL Obfuscation": "Obfuscation Techniques",
        "Suspicious Redirect": "Redirect Tactics",
        "Admin Panel Abuse": "Privilege Escalation Target"
    }
    
    primary_tag = primary_label_map.get(primary)
    filtered_tags = [t for t in tags if t != primary_tag]
    
    if not filtered_tags:
        filtered_tags = ["Active Phishing Marker" if score > 50 else "Suspicious Structure"]
        
    return primary, filtered_tags

def determine_severity(score: int, is_blacklisted: bool = False) -> str:
    """
    Standardised threat severity tiers.
    Elevates minimum severity for known blacklist matches.
    """
    if is_blacklisted:
        score = max(score, 85)
        
    if score <= 20:
        return "Informational"
    elif score <= 40:
        return "Low"
    elif score <= 60:
        return "Medium"
    elif score <= 80:
        return "High"
    else:
        return "Critical"

def determine_consensus(score: int, scan_type: str, details: dict) -> str:
    """
    Determines consensus classification for comparison scans or standalone scans.
    """
    if scan_type == "comparison":
        score_diff = details.get("score_difference", 0)
        if score_diff <= 15:
            return "Strong Consensus"
        elif score_diff <= 30:
            return "Moderate Confidence"
        else:
            return "Weak Consensus"
    else:
        if score >= 80 or details.get("is_blacklisted") or details.get("brand_spoof_detected"):
            return "High Threat Confidence"
        else:
            return "Moderate Confidence"

def generate_educational_insight(category: str, suspected_brand: str = "") -> str:
    """
    Generates educational explanations contextually mapped to the threat category.
    """
    brand_str = suspected_brand if suspected_brand else "trusted brands"
    
    insights = {
        "Financial Fraud": f"Attackers frequently target financial services to steal transaction parameters, credit card data, or account details for monetary gain.",
        "Credential Theft": f"Credential harvesting pages create mock login portals designed to steal username and password credentials from unsuspecting visitors.",
        "Brand Spoofing": f"Brand spoofing exploits user trust by registering visually similar typosquatted domains or homoglyph characters mimicking {brand_str}.",
        "Malware Delivery": f"This page displays structures linked to malware payloads. Visiting these sites exposes hosts to potential drive-by download exploits.",
        "Account Verification Scam": f"Verification scams deploy fake security warnings urging immediate action to confirm credentials, leveraging fear to harvest details.",
        "URL Obfuscation": f"URL obfuscation uses raw IP addresses, excessive subdomains, or percent encoding to conceal destination links from basic scanners.",
        "Suspicious Redirect": f"Suspicious open redirects bypass verification screens, forwarding users from a seemingly trusted domain directly to an attacker's node.",
        "Admin Panel Abuse": f"Administrator consoles are heavily targeted by automated tools attempting to locate default setups for brute force attacks.",
        "Generic Phishing Attempt": f"This URL matches behavioral patterns linked to phishing campaigns. Entering private credentials is highly discouraged."
    }
    
    return insights.get(category, "This domain matches common phishing vectors. Practice general cyber hygiene and verify target domains independently.")

def generate_scan_journey(url: str, domain: str, score: int, details: dict) -> List[Dict[str, Any]]:
    """
    Generates progressive analyst-style checklist tracking threat engine steps.
    """
    journey = []
    
    # 1. Whitelist Check
    is_whitelisted = details.get("is_whitelisted", False)
    whitelist_reason = details.get("whitelist_reason", "")
    if is_whitelisted:
        journey.append({
            "stage": "Whitelist Check",
            "status": "passed",
            "message": whitelist_reason or "Verified safe domain match."
        })
    else:
        journey.append({
            "stage": "Whitelist Check",
            "status": "informational",
            "message": "Domain is not in the verified safe list. Proceeding to threat evaluation."
        })
        
    # 2. Blacklist Check
    is_blacklisted = details.get("is_blacklisted", False)
    blacklist_source = details.get("blacklist_source", "")
    blacklist_indicator = details.get("blacklist_indicator", "")
    if is_blacklisted:
        journey.append({
            "stage": "Blacklist Check",
            "status": "triggered",
            "message": f"Flagged by threat feed ({blacklist_source}): {blacklist_indicator}"
        })
    else:
        journey.append({
            "stage": "Blacklist Check",
            "status": "passed",
            "message": "Domain not found in static threat intel blacklists."
        })
        
    # 3. Brand Spoof Check
    brand_spoof_detected = details.get("brand_spoof_detected", False)
    suspected_brand = details.get("suspected_brand", "")
    spoof_explanation = details.get("spoof_explanation", "")
    if brand_spoof_detected:
        journey.append({
            "stage": "Brand Spoof Check",
            "status": "triggered",
            "message": f"Brand spoof detected targeting {suspected_brand}: {spoof_explanation}"
        })
    else:
        journey.append({
            "stage": "Brand Spoof Check",
            "status": "passed",
            "message": "No brand impersonation or typosquatting signatures matched."
        })
        
    # 4. Rules Engine Heuristics
    scoring_breakdown = details.get("scoring_breakdown", [])
    rule_score = 0
    if details.get("rule_based_result"):
        rule_score = details["rule_based_result"].get("score", 0)
    else:
        rule_score = sum(item.get("points", 0) for item in scoring_breakdown if item.get("points", 0) > 0)
        
    if rule_score > 0:
        journey.append({
            "stage": "Heuristics Rules Engine",
            "status": "warning" if rule_score >= 35 else "informational",
            "message": f"Triggered {len(scoring_breakdown)} structural rules (rules threat index: {rule_score}/100)."
        })
    else:
        journey.append({
            "stage": "Heuristics Rules Engine",
            "status": "passed",
            "message": "URL structure conforms to standard benign patterns."
        })
        
    # 5. ML Engine
    ml_res = details.get("ml_result")
    ml_score = ml_res.get("score", 0) if ml_res else (score if details.get("feature_importances") else None)
    
    if ml_score is not None:
        confidence_str = ""
        if ml_res and ml_res.get("confidence") is not None:
            confidence_str = f" with {int(ml_res['confidence']*100)}% confidence"
        elif details.get("confidence") is not None:
            confidence_str = f" with {int(details['confidence']*100)}% confidence"
            
        journey.append({
            "stage": "ML Prediction Engine",
            "status": "warning" if ml_score >= 35 else "passed",
            "message": f"Model classified threat probability at {ml_score}%{confidence_str}."
        })
    else:
        journey.append({
            "stage": "ML Prediction Engine",
            "status": "informational",
            "message": "Machine learning check bypassed (Rules scan mode)."
        })
        
    # 6. Final Assessment
    sev = determine_severity(score, is_blacklisted)
    journey.append({
        "stage": "Final Assessment",
        "status": "critical" if score >= 80 else ("warning" if score >= 35 else "passed"),
        "message": f"Aggregated threat scan completed. Assigned severity: {sev} (score {score}/100)."
    })
    
    return journey
