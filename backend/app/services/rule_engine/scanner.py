from datetime import datetime, timezone
import uuid
from app.services.rule_engine import validators, scoring, patterns
from app.schemas.scan import ScanResponse, TechnicalDetails
from app.services.intelligence_engine.reputation import assess_reputation
from app.services.spoof_detection.levenshtein_detector import check_brand_spoof

def analyze_url(url: str) -> ScanResponse:
    # 1. Validation
    normalized_url = validators.validate_and_normalize_url(url)
    domain = patterns.extract_domain(normalized_url)
    
    # 2. Scoring (Heuristics Base)
    score, reasons, raw_details = scoring.calculate_threat_score(normalized_url)
    
    # 3. Layered Intelligence (Phase 9 & 10)
    reputation_res = assess_reputation(normalized_url, domain)
    spoof_res = check_brand_spoof(domain)
    
    from app.services.intelligence_engine.domain_age import assess_domain_age, calculate_domain_age_score
    domain_age_data = assess_domain_age(domain)
    
    from app.services.intelligence_engine.threat_feeds.feed_engine import check_threat_feeds
    threat_feeds_data = check_threat_feeds(normalized_url)
    
    intelligence_flags = []
    scoring_breakdown = raw_details.get("scoring_breakdown", [])
    
    if domain_age_data:
        age_days = domain_age_data.get("domain_age_days")
        if age_days is not None:
            age_score = calculate_domain_age_score(age_days)
            if age_score > 0:
                score += age_score
                reasons.append(f"Domain was registered recently ({age_days} days ago)")
                intelligence_flags.append(f"Young Domain: {age_days} days old")
                scoring_breakdown.append({"rule": f"Newly Registered Domain", "points": age_score})
        elif domain_age_data.get("status") == "unregistered":
            # Very high risk if unregistered but actively serving content (often means fast-flux or malicious)
            score += 35
            reasons.append("Domain appears unregistered but is active (Highly Suspicious)")
            intelligence_flags.append("Unregistered Domain")
            scoring_breakdown.append({"rule": "Active Unregistered Domain", "points": 35})
    
    # Apply Whitelist Reputation delta
    if reputation_res["is_whitelisted"]:
        score += reputation_res["reputation_score_delta"]
        reasons.append(f"Whitelisted domain reputation: {reputation_res['whitelist_reason']}")
        intelligence_flags.append(f"Whitelisted: {reputation_res['whitelist_reason']}")
        scoring_breakdown.append({"rule": "Reputation Whitelist Credit", "points": reputation_res["reputation_score_delta"]})
        
    # Apply Blacklist Reputation delta and floor
    if reputation_res["is_blacklisted"]:
        score += reputation_res["reputation_score_delta"]
        if reputation_res["score_floor"] > 0:
            score = max(score, reputation_res["score_floor"])
        reasons.append(f"Flagged in threat intelligence feed: {reputation_res['blacklist_indicator']}")
        intelligence_flags.append(f"Blacklisted: {reputation_res['blacklist_indicator']}")
        scoring_breakdown.append({"rule": f"Threat Intel Blacklist Match", "points": reputation_res["reputation_score_delta"]})
        
    # Apply Threat Feed matches
    if threat_feeds_data.get("matched_sources"):
        matched_str = ", ".join(threat_feeds_data["matched_sources"])
        if threat_feeds_data.get("openphish_match"):
            score += 50
            scoring_breakdown.append({"rule": "OpenPhish Threat Feed Match", "points": 50})
        if threat_feeds_data.get("phishtank_match"):
            score += 50
            scoring_breakdown.append({"rule": "PhishTank Threat Feed Match", "points": 50})
        if threat_feeds_data.get("urlhaus_match"):
            score += 60
            scoring_breakdown.append({"rule": "URLHaus Threat Feed Match", "points": 60})
            
        reasons.append(f"Flagged by dynamic Threat Intelligence Feed(s): {matched_str}")
        intelligence_flags.append(f"Threat Feed Match: {matched_str}")
        
    # Apply Brand Spoofing delta
    if spoof_res["is_spoofed"]:
        score += 25
        reasons.append(spoof_res["explanation"])
        intelligence_flags.append(f"Brand Spoof: {spoof_res['spoof_type']} impersonating {spoof_res['suspected_brand']}")
        scoring_breakdown.append({"rule": f"Brand Spoofing ({spoof_res['spoof_type']})", "points": 25})

    # Ensure score limits
    score = max(0, min(score, 100))
    
    # 4. Base Classification
    base_status = scoring.classify_score(score)

    # 5. Analyst Classification (Phase 10)
    from app.services.intelligence_engine import classifier
    temp_details = {
        "is_whitelisted": reputation_res["is_whitelisted"],
        "whitelist_reason": reputation_res["whitelist_reason"],
        "is_blacklisted": reputation_res["is_blacklisted"],
        "blacklist_source": reputation_res["blacklist_source"],
        "blacklist_indicator": reputation_res["blacklist_indicator"],
        "threat_feeds": threat_feeds_data,
        "brand_spoof_detected": spoof_res["is_spoofed"],
        "suspected_brand": spoof_res["suspected_brand"],
        "spoof_explanation": spoof_res["explanation"],
        "spoof_type": spoof_res["spoof_type"],
        "domain_age_days": domain_age_data["domain_age_days"] if domain_age_data else None,
        "domain": domain,
        "contains_ip": raw_details["contains_ip"],
        "subdomain_count": raw_details["subdomain_count"],
        "encoded_char_presence": False,
        "redirect_pattern_detected": raw_details["redirect_pattern_detected"],
        "scoring_breakdown": scoring_breakdown
    }
    threat_category, secondary_tags = classifier.determine_category_and_tags(score, temp_details, reasons)
    final_verdict, conf_str, esc_trigger, esc_reason, score = classifier.evaluate_final_verdict(score, temp_details)
    
    # Update consensus with potentially modified score
    consensus_level = classifier.determine_consensus(score, "rules", temp_details)
    educational_insight = classifier.generate_educational_insight(threat_category, spoof_res["suspected_brand"])
    
    # 6. Recommendation formatting
    from app.services import recommendation_engine
    recommendation = recommendation_engine.generate_recommendation(
        final_verdict=final_verdict,
        score=score,
        reasons=reasons,
        technical_details=raw_details
    )
    
    scan_journey = classifier.generate_scan_journey(normalized_url, domain, score, temp_details, final_verdict, conf_str, consensus_level, esc_trigger, esc_reason, recommendation)

    if not reasons and final_verdict == "SAFE":
        reasons.append("No common threats detected.")

    # 7. Pack Response
    scan_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    
    details = TechnicalDetails(
        https=raw_details["https"],
        domain=raw_details["domain"],
        subdomain_count=raw_details["subdomain_count"],
        url_length=raw_details["url_length"],
        contains_ip=raw_details["contains_ip"],
        suspicious_keywords_found=raw_details["suspicious_keywords_found"],
        suspicious_tld=raw_details["suspicious_tld"],
        redirect_pattern_detected=raw_details["redirect_pattern_detected"],
        scoring_breakdown=scoring_breakdown,
        
        # Phase 9 fields
        intelligence_flags=intelligence_flags if intelligence_flags else None,
        is_whitelisted=reputation_res["is_whitelisted"],
        whitelist_reason=reputation_res["whitelist_reason"] if reputation_res["is_whitelisted"] else None,
        is_blacklisted=reputation_res["is_blacklisted"],
        blacklist_source=reputation_res["blacklist_source"] if reputation_res["is_blacklisted"] else None,
        brand_spoof_detected=spoof_res["is_spoofed"],
        suspected_brand=spoof_res["suspected_brand"] if spoof_res["is_spoofed"] else None,
        spoof_explanation=spoof_res["explanation"] if spoof_res["is_spoofed"] else None,
        spoof_type=spoof_res["spoof_type"] if spoof_res["is_spoofed"] else None,

        # Phase 10 fields
        threat_category=threat_category,
        secondary_threat_tags=secondary_tags,
        severity_tier=final_verdict,
        consensus_level=consensus_level,
        educational_insight=educational_insight,
        scan_journey=scan_journey,
        threat_feeds=threat_feeds_data
    )


    evidence = []
    if spoof_res["is_spoofed"]:
        evidence.append("Brand Spoof Detection Triggered")
    if threat_category:
        evidence.append(f"{threat_category} Classification")
    evidence.append(f"Rule Engine Score: {score}/100")
    
    if threat_feeds_data and threat_feeds_data.get("matched_sources"):
        evidence.append("Threat Feed Check: Matched")
    else:
        evidence.append("Threat Feed Check: No Match")
        
    if domain_age_data and domain_age_data.get("status") == "unregistered":
        evidence.append("Domain Age Intelligence: Unregistered Domain")

    return ScanResponse(
        scan_id=scan_id,
        scan_type="rule-based",
        scanned_url=normalized_url,
        status=final_verdict,
        score=score,
        reasons=reasons,
        technical_details=details,
        recommendation=recommendation,
        timestamp=timestamp,
        scan_metadata={
            "decision_snapshot": {
                "final_verdict": final_verdict,
                "confidence": conf_str,
                "consensus": consensus_level,
                "escalation_trigger": esc_trigger,
                "root_cause": esc_reason
            },
            "supporting_evidence": evidence,
            "domain_intelligence": domain_age_data,
            "threat_feeds": threat_feeds_data
        }
    )

