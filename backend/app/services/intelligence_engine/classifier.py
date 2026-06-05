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
    
    # 9. Domain Age Flags
    is_young_domain = "newly registered domain" in reasons_text or "young domain" in str(details.get("intelligence_flags", [])).lower()
    
    # Build tag list
    if is_financial: tags.append("Financial Sector")
    if is_cred_theft: tags.append("Credential Harvesting")
    if is_brand_spoof: tags.append("Brand Mimicry")
    if is_malware: tags.append("Potential Payload")
    if is_verification_scam: tags.append("Security Alert Theme")
    if is_obfuscation: tags.append("Obfuscation Techniques")
    if is_redirect: tags.append("Redirect Tactics")
    if is_admin_abuse: tags.append("Privilege Escalation Target")
    if is_young_domain: tags.append("Recent Registration")
    
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
    elif is_young_domain and score >= 35:
        primary = "Newly Registered Domain"
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
        "Admin Panel Abuse": "Privilege Escalation Target",
        "Newly Registered Domain": "Recent Registration"
    }
    
    primary_tag = primary_label_map.get(primary)
    filtered_tags = [t for t in tags if t != primary_tag]
    
    if not filtered_tags:
        filtered_tags = ["Active Phishing Marker" if score > 50 else "Suspicious Structure"]
        
    return primary, filtered_tags

def evaluate_final_verdict(score: int, details: dict) -> Tuple[str, str, str, str, int, dict]:
    """
    Intelligence Escalation Layer & Final Verdict Engine.
    Enforces absolute rules based on the Verdict Precedence Hierarchy.
    Returns (final_verdict, confidence, escalation_trigger, escalation_reason, final_score)
    """
    # 1. Base Verdict and Confidence from Score
    if score < 35: 
        final_verdict = "SAFE"
        confidence = "High" if score < 15 else "Moderate"
    elif score < 70: 
        final_verdict = "SUSPICIOUS"
    elif score < 85: 
        final_verdict = "HIGH RISK"
    else: 
        final_verdict = "CRITICAL"
        
    escalation_trigger = None
    escalation_reason = None
    
    # Precedence Hierarchy Values
    verdict_levels = {"SAFE": 0, "SUSPICIOUS": 1, "HIGH RISK": 2, "CRITICAL": 3, "MALICIOUS": 4}
    
    def escalate(new_verdict: str, trigger: str, reason: str):
        nonlocal final_verdict, escalation_trigger, escalation_reason
        if verdict_levels[new_verdict] > verdict_levels[final_verdict] or (verdict_levels[new_verdict] == verdict_levels[final_verdict] and escalation_trigger is None):
            final_verdict = new_verdict
            escalation_trigger = trigger
            escalation_reason = reason
            
    brand_spoof_detected = details.get("brand_spoof_detected", False)
    suspected_brand = details.get("suspected_brand", "") if brand_spoof_detected else ""
    is_financial = False
    if brand_spoof_detected:
        if suspected_brand.lower() in ("paypal", "chase", "bank of america", "wells fargo", "citibank", "stripe", "coinbase", "binance", "metamask", "americanexpress", "discover"):
            is_financial = True
            
    is_unregistered = details.get("domain_age_days") == -1
    has_threat_feed = bool(details.get("threat_feeds", {}).get("matched_sources"))
    is_blacklisted = details.get("is_blacklisted", False)

    # Escalation Rules (Lowest to Highest Precedence)
    # Rule 1: Brand Spoof -> Min Verdict: SUSPICIOUS
    if brand_spoof_detected:
        escalate("SUSPICIOUS", "Brand Spoof Detection", f"Potential {suspected_brand} impersonation detected.")
        score = max(score, 45)
        
    # Rule 3: Brand Spoof + Unregistered Domain -> Min Verdict: HIGH RISK
    if brand_spoof_detected and is_unregistered:
        escalate("HIGH RISK", "Brand Spoof Detection & Unregistered Domain", f"Potential {suspected_brand} impersonation hosted on unregistered infrastructure.")
        score = max(score, 75)
        
    # Rule 2: Brand Spoof + Financial Brand -> Min Verdict: HIGH RISK
    if brand_spoof_detected and is_financial:
        escalate("HIGH RISK", "Financial Brand Spoof Detection", f"Potential impersonation of financial institution ({suspected_brand}).")
        score = max(score, 80)
        
    # Rule 4: Threat Feed Match -> Min Verdict: CRITICAL
    if has_threat_feed or is_blacklisted:
        escalate("CRITICAL", "Threat Intelligence Feed", "Domain matches active indicators of compromise in threat feeds.")
        score = max(score, 90)
        
    # Rule 5: Threat Feed + Spoof -> Final Verdict: MALICIOUS
    if (has_threat_feed or is_blacklisted) and brand_spoof_detected:
        escalate("MALICIOUS", "Confirmed Malicious Impersonation", f"Known malicious infrastructure actively spoofing {suspected_brand}.")
        score = 100

    if has_threat_feed:
        confidence = "Very High"
    elif brand_spoof_detected:
        confidence = "High"
    elif is_unregistered:
        confidence = "Medium"
    elif final_verdict == "SAFE":
        confidence = "High"
    else:
        confidence = "Medium"
        
    evidence_snapshot = {
        "brand_spoof_detected": brand_spoof_detected,
        "threat_feed_match": has_threat_feed,
        "domain_age_status": details.get("domain_age_status", "unknown"),
        "threat_category": details.get("threat_category", "Unknown"),
        "rule_score": details.get("rule_score", score),
        "ml_score": details.get("ml_score", 0)
    }

    return final_verdict, confidence, escalation_trigger, escalation_reason, score, evidence_snapshot
def determine_consensus(score: int, scan_type: str, details: dict) -> str:
    """
    Determines consensus classification by evaluating agreement across Intelligence Layers.
    Does NOT conflate with Confidence.
    """
    has_threat_feed = bool(details.get("threat_feeds", {}).get("matched_sources"))
    brand_spoof_detected = details.get("brand_spoof_detected", False)
    
    if scan_type == "comparison":
        rule_score = details.get("rule_based_result", {}).get("score", 0)
        ml_score = details.get("ml_result", {}).get("score", 0)
        
        # If rules and ML agree that it's low threat, but intelligence escalates it:
        if (rule_score < 35 and ml_score < 35) and (has_threat_feed or brand_spoof_detected):
            return "Divided"
            
        score_diff = details.get("score_difference", 0)
        if score_diff <= 15:
            return "Strong Consensus"
        elif score_diff <= 30:
            return "Moderate Consensus"
        else:
            return "Divided"
    else:
        # Single engine
        base_engine_safe = score < 35
        if base_engine_safe and (has_threat_feed or brand_spoof_detected):
            return "Divided"
            
        return "Strong Consensus"

def generate_educational_insight(category: str, suspected_brand: str = "") -> str:
    """
    Generates educational explanations contextually mapped to the threat category.
    """
    brand_str = suspected_brand if suspected_brand else "trusted brands"
    
    insights = {
        "Safe Domain": "No phishing indicators or suspicious patterns were detected. The domain appears legitimate and structurally sound.",
        "Financial Fraud": f"Attackers frequently target financial services to steal transaction parameters, credit card data, or account details for monetary gain.",
        "Credential Theft": f"Credential harvesting pages create mock login portals designed to steal username and password credentials from unsuspecting visitors.",
        "Brand Spoofing": f"Brand spoofing exploits user trust by registering visually similar typosquatted domains or homoglyph characters mimicking {brand_str}.",
        "Malware Delivery": f"This page displays structures linked to malware payloads. Visiting these sites exposes hosts to potential drive-by download exploits.",
        "Account Verification Scam": f"Verification scams deploy fake security warnings urging immediate action to confirm credentials, leveraging fear to harvest details.",
        "URL Obfuscation": f"URL obfuscation uses raw IP addresses, excessive subdomains, or percent encoding to conceal destination links from basic scanners.",
        "Suspicious Redirect": f"Suspicious open redirects bypass verification screens, forwarding users from a seemingly trusted domain directly to an attacker's node.",
        "Admin Panel Abuse": f"Administrator consoles are heavily targeted by automated tools attempting to locate default setups for brute force attacks.",
        "Newly Registered Domain": f"Newly registered domains are commonly used in phishing campaigns because they have little reputation history and can be discarded quickly after detection.",
        "Generic Phishing Attempt": f"This URL matches behavioral patterns linked to phishing campaigns. Entering private credentials is highly discouraged."
    }
    
    return insights.get(category, "This domain matches common phishing vectors. Practice general cyber hygiene and verify target domains independently.")

def generate_scan_journey(url: str, domain: str, score: int, details: dict, final_verdict: str = None, confidence: str = None, consensus: str = None, escalation_trigger: str = None, escalation_reason: str = None, recommendation: str = None) -> List[Dict[str, Any]]:
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
        
    # 2.5 Threat Feed Check
    threat_feeds = details.get("threat_feeds", {})
    if threat_feeds and threat_feeds.get("matched_sources"):
        sources = ", ".join(threat_feeds["matched_sources"])
        journey.append({
            "stage": "Dynamic Threat Feed Check",
            "status": "critical",
            "message": f"Active threat detected by intelligence feeds: {sources} (Confidence: {threat_feeds.get('confidence', 'High')})"
        })
    else:
        journey.append({
            "stage": "Dynamic Threat Feed Check",
            "status": "passed",
            "message": "Domain not present in dynamic phishing or malware feeds."
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
        
    # 3.5 Domain Age Intelligence Check
    domain_age_days = details.get("domain_age_days")
    if domain_age_days is not None:
        if domain_age_days == -1:
            journey.append({
                "stage": "Domain Age Check",
                "status": "warning",
                "message": "Unregistered Domain Detected. Potential phishing infrastructure indicator."
            })
        elif domain_age_days <= 30:
            journey.append({
                "stage": "Domain Age Check",
                "status": "triggered",
                "message": f"Domain registered very recently ({domain_age_days} days ago)."
            })
        elif domain_age_days <= 90:
            journey.append({
                "stage": "Domain Age Check",
                "status": "warning",
                "message": f"Domain registration is relatively new ({domain_age_days} days old)."
            })
        else:
            journey.append({
                "stage": "Domain Age Check",
                "status": "passed",
                "message": f"Domain has established registration history ({domain_age_days} days old)."
            })
    else:
        journey.append({
            "stage": "Domain Age Check",
            "status": "informational",
            "message": "Unable to determine registration age (Lookup fallback)."
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
        
    # Final Assessment is only appended if final_verdict is passed (from API route)
    if final_verdict:
        reason_text = escalation_reason if escalation_reason else ("No specific threat intelligence triggers detected." if final_verdict == "SAFE" else "Score threshold exceeded based on heuristics/ML patterns.")
        
        assessment_msg = f"Final Verdict:\n{final_verdict}\n\nReason:\n{reason_text}"
        if escalation_trigger:
            assessment_msg += f"\n\nEscalation Trigger:\n{escalation_trigger}"
        
        assessment_msg += f"\n\nConfidence:\n{confidence}\n\nConsensus:\n{consensus}\n\nRecommended Action:\n{recommendation}"
        
        status_mapping = {
            "SAFE": "passed",
            "SUSPICIOUS": "warning",
            "HIGH RISK": "critical",
            "CRITICAL": "critical",
            "MALICIOUS": "critical"
        }
    
        journey.append({
            "stage": "Final Assessment",
            "status": status_mapping.get(final_verdict, "informational"),
            "message": assessment_msg
        })
    
    return journey
