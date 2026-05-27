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
    
    # 3. Layered Intelligence (Phase 9)
    reputation_res = assess_reputation(normalized_url, domain)
    spoof_res = check_brand_spoof(domain)
    
    intelligence_flags = []
    scoring_breakdown = raw_details.get("scoring_breakdown", [])
    
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
        
    # Apply Brand Spoofing delta
    if spoof_res["is_spoofed"]:
        score += 25
        reasons.append(spoof_res["explanation"])
        intelligence_flags.append(f"Brand Spoof: {spoof_res['spoof_type']} impersonating {spoof_res['suspected_brand']}")
        scoring_breakdown.append({"rule": f"Brand Spoofing ({spoof_res['spoof_type']})", "points": 25})

    # Ensure score limits
    score = max(0, min(score, 100))
    
    # 4. Classification
    status = scoring.classify_score(score)

    # 5. Analyst Classification (Phase 10)
    from app.services.intelligence_engine import classifier
    temp_details = {
        "is_whitelisted": reputation_res["is_whitelisted"],
        "whitelist_reason": reputation_res["whitelist_reason"],
        "is_blacklisted": reputation_res["is_blacklisted"],
        "blacklist_source": reputation_res["blacklist_source"],
        "blacklist_indicator": reputation_res["blacklist_indicator"],
        "brand_spoof_detected": spoof_res["is_spoofed"],
        "suspected_brand": spoof_res["suspected_brand"],
        "spoof_explanation": spoof_res["explanation"],
        "spoof_type": spoof_res["spoof_type"],
        "domain": domain,
        "contains_ip": raw_details["contains_ip"],
        "subdomain_count": raw_details["subdomain_count"],
        "encoded_char_presence": False,
        "redirect_pattern_detected": raw_details["redirect_pattern_detected"],
        "scoring_breakdown": scoring_breakdown
    }
    threat_category, secondary_tags = classifier.determine_category_and_tags(score, temp_details, reasons)
    severity_tier = classifier.determine_severity(score, reputation_res["is_blacklisted"])
    consensus_level = classifier.determine_consensus(score, "rule-based", temp_details)
    educational_insight = classifier.generate_educational_insight(threat_category, spoof_res["suspected_brand"])
    scan_journey = classifier.generate_scan_journey(normalized_url, domain, score, temp_details)
    
    # 6. Recommendation formatting
    from app.services import recommendation_engine
    recommendation = recommendation_engine.generate_recommendation(
        status=status,
        score=score,
        reasons=reasons,
        technical_details=raw_details
    )

    if not reasons and status == "SAFE":
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
        severity_tier=severity_tier,
        consensus_level=consensus_level,
        educational_insight=educational_insight,
        scan_journey=scan_journey
    )


    return ScanResponse(
        scan_id=scan_id,
        scan_type="rule-based",
        scanned_url=normalized_url,
        status=status,
        score=score,
        reasons=reasons,
        technical_details=details,
        recommendation=recommendation,
        timestamp=timestamp
    )

