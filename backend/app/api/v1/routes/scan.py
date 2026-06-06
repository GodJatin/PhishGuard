import logging
import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Header, Depends
from app.schemas.scan import ScanRequest, ScanResponse, TechnicalDetails
from app.services.rule_engine import scanner, patterns, constants
from app.services.model_engine import predictor
from app.core.config import settings
from app.utils.auth_helpers import get_current_user_id, get_authorized_scan
from supabase import create_client, Client
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Supabase Service Role Client (bypasses RLS for inserts)
logger.info("Initializing Supabase client with URL: %s", settings.SUPABASE_URL)
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
logger.info("Supabase service client initialized successfully.")

@router.post("/rule-based", response_model=ScanResponse)
def scan_url_rule_based(request: ScanRequest, authorization: Optional[str] = Header(None)):
    # --- Step 1: Analyze URL ---
    logger.info("New scan request for URL: %s", request.url)
    
    try:
        report = scanner.analyze_url(request.url)
        logger.info("Analysis complete. Score=%d, Status=%s", report.score, report.status)
        
        # Attach Domain Intelligence to Metadata
        from app.services.intelligence_engine.domain_age import assess_domain_age
        domain = patterns.extract_domain(request.url)
        da_data = assess_domain_age(domain)
        if da_data:
            if not request.scan_metadata:
                request.scan_metadata = {}
            request.scan_metadata["domain_intelligence"] = da_data
            
        if report.technical_details.threat_feeds:
            if not request.scan_metadata:
                request.scan_metadata = {}
            request.scan_metadata["threat_feeds"] = report.technical_details.threat_feeds

    except ValueError as ve:
        logger.warning("Validation error: %s", ve)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Unexpected error during analysis")
        raise HTTPException(status_code=500, detail="Internal error during URL analysis.")

    # --- Step 2: Extract JWT and verify user ---
    user_id = None
    logger.info("Authorization header present: %s", authorization is not None)
    
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        # NOTE: Do NOT log token values or prefixes — security requirement
        try:
            user_resp = supabase.auth.get_user(token)
            if user_resp and user_resp.user:
                user_id = user_resp.user.id
                logger.info("Authenticated user_id: %s", user_id)
            else:
                logger.warning("JWT validation returned no user — token may be expired or invalid.")
        except Exception:
            logger.warning("JWT verification failed for rule-based scan — proceeding as unauthenticated.")
    else:
        logger.info("No valid Authorization header — scan will not be persisted.")

    # --- Step 3: Persist to Supabase ---
    if not request.scan_metadata:
        request.scan_metadata = {}
    request.scan_metadata.update(report.scan_metadata)
    
    if user_id:
        # DB status must be lowercase to satisfy the check constraint
        db_status = report.status.lower()
        
        data = {
            "id": report.scan_id,
            "user_id": user_id,
            "url": report.scanned_url,
            "scan_type": report.scan_type,
            "status": db_status,          # lowercase: safe / suspicious / dangerous
            "score": report.score,
            "reasons": report.reasons,
            "technical_details": report.technical_details.model_dump(),
            "recommendation": report.recommendation,
            "created_at": report.timestamp,
            "scan_source": request.scan_source,
            "scan_metadata": request.scan_metadata
        }
        
        logger.info("Inserting scan payload into Supabase: id=%s, user_id=%s, url=%s, status=%s, score=%d",
                    data['id'], data['user_id'], data['url'], data['status'], data['score'])
        
        try:
            result = supabase.table("scans").insert(data).execute()
            logger.info("Insert successful. Response data count: %d", len(result.data) if result.data else 0)
            if result.data:
                logger.info("Inserted row ID: %s", result.data[0].get('id'))
        except Exception as db_err:
            logger.exception("Insert FAILED")
            # We still return the report to the user — persistence failure is non-fatal
    else:
        logger.info("Skipping DB insert — user not authenticated.")

    logger.info("Returning report to client. Status=%s", report.status)
    report.scan_source = request.scan_source
    report.scan_metadata = request.scan_metadata
    return report

@router.post("/ml", response_model=ScanResponse)
def scan_url_ml(request: ScanRequest, authorization: Optional[str] = Header(None)):
    """
    Scan a URL using the pretrained Machine Learning Model.
    """
    logger.info("New ML scan request for URL: %s", request.url)
    
    # 1. Prediction
    try:
        status, score, confidence, feats, reasons, recommendation = predictor.predict_url(request.url)
        logger.info("ML Analysis complete. Base Score=%d, Status=%s, Confidence=%.2f", score, status, confidence)
    except ValueError as ve:
        logger.warning("ML Validation error: %s", ve)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Unexpected error during ML analysis")
        raise HTTPException(status_code=503, detail=f"ML Engine currently unavailable: {str(e)}")

    # 2. Layered Intelligence (Phase 9 & 10)
    from app.services.intelligence_engine.reputation import assess_reputation
    from app.services.spoof_detection.levenshtein_detector import check_brand_spoof
    from app.services.intelligence_engine.domain_age import assess_domain_age, calculate_domain_age_score
    from app.services.intelligence_engine.threat_feeds.feed_engine import check_threat_feeds, normalize_url_for_cache
    
    domain = patterns.extract_domain(request.url)
    reputation_res = assess_reputation(request.url, domain)
    spoof_res = check_brand_spoof(domain)
    domain_age_data = assess_domain_age(domain)
    threat_feeds_data = check_threat_feeds(normalize_url_for_cache(request.url))
    
    intelligence_flags = []
    scoring_breakdown = feats.get("scoring_breakdown", [])
    
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
            score += 35
            reasons.append("Domain appears unregistered but is active (Highly Suspicious)")
            intelligence_flags.append("Unregistered Domain")
            scoring_breakdown.append({"rule": "Active Unregistered Domain", "points": 35})
    
    if reputation_res["is_whitelisted"]:
        score += reputation_res["reputation_score_delta"]
        reasons.append(f"Whitelisted domain reputation: {reputation_res['whitelist_reason']}")
        intelligence_flags.append(f"Whitelisted: {reputation_res['whitelist_reason']}")
        scoring_breakdown.append({"rule": "Reputation Whitelist Credit", "points": reputation_res["reputation_score_delta"]})
        
    if reputation_res["is_blacklisted"]:
        score += reputation_res["reputation_score_delta"]
        if reputation_res["score_floor"] > 0:
            score = max(score, reputation_res["score_floor"])
        reasons.append(f"Flagged in threat intelligence feed: {reputation_res['blacklist_indicator']}")
        intelligence_flags.append(f"Blacklisted: {reputation_res['blacklist_indicator']}")
        scoring_breakdown.append({"rule": f"Threat Intel Blacklist Match", "points": reputation_res["reputation_score_delta"]})
        
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
        
    if spoof_res["is_spoofed"]:
        score += 25
        reasons.append(spoof_res["explanation"])
        intelligence_flags.append(f"Brand Spoof: {spoof_res['spoof_type']} impersonating {spoof_res['suspected_brand']}")
        scoring_breakdown.append({"rule": f"Brand Spoofing ({spoof_res['spoof_type']})", "points": 25})

    score = max(0, min(score, 100))
    if score < 35:
        base_status = "SAFE"
    elif score < 70:
        base_status = "SUSPICIOUS"
    else:
        base_status = "DANGEROUS"

    # 3. Extract JWT and verify user (bypass RLS for save)
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            user_resp = supabase.auth.get_user(token)
            if user_resp and user_resp.user:
                user_id = user_resp.user.id
        except Exception:
            logger.warning("JWT verification failed for ML scan — proceeding as unauthenticated.")

    # 4. Pack Response
    scan_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    keywords_found = patterns.find_suspicious_keywords(request.url, constants.SUSPICIOUS_KEYWORDS)

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
        "domain_age_days": domain_age_data["domain_age_days"] if domain_age_data else None,
        "domain": domain,
        "contains_ip": feats["contains_ip"] == 1,
        "subdomain_count": int(feats["subdomain_count"]),
        "encoded_char_presence": feats["encoded_char_presence"] == 1,
        "redirect_pattern_detected": feats["redirect_pattern"] == 1,
        "scoring_breakdown": scoring_breakdown,
        "model_outputs": {"random_forest": {"score": score}},
        "ml_result": {"score": score, "confidence": confidence},
        "confidence": confidence,
        "threat_feeds": threat_feeds_data
    }
    threat_category, secondary_tags = classifier.determine_category_and_tags(score, temp_details, reasons)
    final_verdict, conf_str, esc_trigger, esc_reason, score, evidence_snapshot = classifier.evaluate_final_verdict(score, temp_details)
    
    consensus_level = classifier.determine_consensus(score, "ml", temp_details)
    educational_insight = classifier.generate_educational_insight(threat_category, spoof_res["suspected_brand"])
    
    from app.services import recommendation_engine
    recommendation = recommendation_engine.generate_recommendation(
        final_verdict=final_verdict,
        score=score,
        reasons=reasons,
        technical_details=temp_details
    )
    
    scan_journey = classifier.generate_scan_journey(request.url, domain, score, temp_details, final_verdict, conf_str, consensus_level, esc_trigger, esc_reason, recommendation)

    details = TechnicalDetails(
        https=feats["https"] == 1,
        domain=domain,
        subdomain_count=int(feats["subdomain_count"]),
        url_length=int(feats["url_length"]),
        contains_ip=feats["contains_ip"] == 1,
        suspicious_keywords_found=keywords_found,
        suspicious_tld=feats["suspicious_tld"] == 1,
        redirect_pattern_detected=feats["redirect_pattern"] == 1,
        path_depth=int(feats["path_depth"]),
        query_parameter_count=int(feats["query_parameter_count"]),
        entropy_score=float(feats["entropy_score"]),
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
        feature_importances=feats.get("feature_importances"),
        ml_interpretation=feats.get("ml_interpretation"),

        # Phase 10 fields
        threat_category=threat_category,
        secondary_threat_tags=secondary_tags,
        severity_tier=final_verdict,  # Map final_verdict to severity_tier for backward compatibility
        consensus_level=consensus_level,
        educational_insight=educational_insight,
        scan_journey=scan_journey,
        threat_feeds=threat_feeds_data
    )


    # 5. Populate Metadata
    if not request.scan_metadata:
        request.scan_metadata = {}
        
    if domain_age_data:
        request.scan_metadata["domain_intelligence"] = domain_age_data
        
    if threat_feeds_data:
        request.scan_metadata["threat_feeds"] = threat_feeds_data
        
    evidence = []
    if spoof_res["is_spoofed"]:
        evidence.append("Brand Spoof Detection Triggered")
    if threat_category:
        evidence.append(f"{threat_category} Classification")
    evidence.append(f"ML Engine Score: {score}/100")
    
    if threat_feeds_data and threat_feeds_data.get("matched_sources"):
        evidence.append("Threat Feed Result: Match Found")
    else:
        evidence.append("Threat Feed Result: No Match")
        
    if domain_age_data:
        status_str = domain_age_data.get("status", "unknown").capitalize()
        evidence.append(f"Domain Intelligence Status: {status_str}")

    request.scan_metadata["decision_snapshot"] = {
        "final_verdict": final_verdict,
        "confidence": conf_str,
        "consensus": consensus_level,
        "escalation_trigger": esc_trigger,
        "root_cause": esc_reason
    }
    request.scan_metadata["evidence_snapshot"] = evidence_snapshot
    request.scan_metadata["supporting_evidence"] = evidence

    response = ScanResponse(
        scan_id=scan_id,
        scan_type="ml",
        scanned_url=request.url,
        status=final_verdict,
        score=score,
        reasons=reasons,
        technical_details=details,
        recommendation=recommendation,
        timestamp=timestamp,
        confidence=str(confidence) if confidence is not None else None,
        scan_source=request.scan_source,
        scan_metadata=request.scan_metadata
    )

    # 6. Save to Database
    if user_id:
        db_status = "safe"
        if final_verdict.upper() == "SUSPICIOUS":
            db_status = "suspicious"
        elif final_verdict.upper() in ["HIGH RISK", "CRITICAL", "DANGEROUS"]:
            db_status = "dangerous"
            
        db_tech_details = details.model_dump()
        db_tech_details["confidence"] = confidence  # Store numerical confidence inside JSON
        
        data = {
            "id": scan_id,
            "user_id": user_id,
            "url": request.url,
            "scan_type": "ml",
            "status": db_status,
            "score": score,
            "reasons": reasons,
            "technical_details": db_tech_details,
            "recommendation": recommendation,
            "created_at": timestamp,
            "scan_source": request.scan_source,
            "scan_metadata": request.scan_metadata
        }
        
        logger.info("Inserting ML scan payload into Supabase: id=%s, user_id=%s, status=%s", scan_id, user_id, db_status)
        try:
            result = supabase.table("scans").insert(data).execute()
            logger.info("ML Insert successful. Response data count: %d", len(result.data) if result.data else 0)
        except Exception as db_err:
            logger.exception("ML database insert FAILED")
            
    return response


@router.post("/comparison", response_model=ScanResponse)
def scan_url_comparison(request: ScanRequest, authorization: Optional[str] = Header(None)):
    """
    Compare Rule-based and Machine Learning scan results for a URL.
    """
    logger.info("New comparison scan request for URL: %s", request.url)
    
    # 1. Run Rule-based analyze
    try:
        rule_report = scanner.analyze_url(request.url)
    except ValueError as ve:
        logger.warning("Validation error in comparison scan (rule-based): %s", ve)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Unexpected error during rule-based analysis in comparison")
        raise HTTPException(status_code=500, detail="Internal error during rule analysis.")

    # 2. Run ML analyze
    try:
        ml_status, ml_score, ml_confidence, ml_feats, ml_reasons, ml_rec = predictor.predict_url(request.url)
    except Exception as e:
        logger.exception("Unexpected error during ML analysis in comparison")
        raise HTTPException(status_code=503, detail=f"ML Engine currently unavailable: {str(e)}")

    # Adjust ML score with reputation/spoof for fair comparison
    from app.services.intelligence_engine.reputation import assess_reputation
    from app.services.spoof_detection.levenshtein_detector import check_brand_spoof
    
    domain = patterns.extract_domain(request.url)
    ml_reputation = assess_reputation(request.url, domain)
    ml_spoof = check_brand_spoof(domain)
    
    from app.services.intelligence_engine.domain_age import assess_domain_age, calculate_domain_age_score
    domain_age_data = assess_domain_age(domain)
    
    from app.services.intelligence_engine.threat_feeds.feed_engine import check_threat_feeds, normalize_url_for_cache
    threat_feeds_data = check_threat_feeds(normalize_url_for_cache(request.url))
    
    if ml_reputation["is_whitelisted"]:
        ml_score += ml_reputation["reputation_score_delta"]
    if ml_reputation["is_blacklisted"]:
        ml_score += ml_reputation["reputation_score_delta"]
        if ml_reputation["score_floor"] > 0:
            ml_score = max(ml_score, ml_reputation["score_floor"])
    if ml_spoof["is_spoofed"]:
        ml_score += 25
        
    if threat_feeds_data.get("matched_sources"):
        if threat_feeds_data.get("openphish_match"): ml_score += 50
        if threat_feeds_data.get("phishtank_match"): ml_score += 50
        if threat_feeds_data.get("urlhaus_match"): ml_score += 60
        matched_str = ", ".join(threat_feeds_data["matched_sources"])
        ml_reasons.append(f"Flagged by dynamic Threat Intelligence Feed(s): {matched_str}")
        
    if domain_age_data:
        age_days = domain_age_data.get("domain_age_days")
        if age_days is not None:
            age_score = calculate_domain_age_score(age_days)
            if age_score > 0:
                ml_score += age_score
                ml_reasons.append(f"Domain was registered recently ({age_days} days ago)")
        elif domain_age_data.get("status") == "unregistered":
            ml_score += 35
            ml_reasons.append("Domain appears unregistered but is active (Highly Suspicious)")
            
    ml_score = max(0, min(ml_score, 100))
    if ml_score < 35:
        ml_status = "SAFE"
    elif ml_score < 70:
        ml_status = "SUSPICIOUS"
    else:
        ml_status = "DANGEROUS"

    # 3. Extract user id from JWT
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            user_resp = supabase.auth.get_user(token)
            if user_resp and user_resp.user:
                user_id = user_resp.user.id
        except Exception:
            logger.warning("JWT verification failed for comparison scan — proceeding as unauthenticated.")

    # 4. Generate comparison indicators and notes
    rule_indicators = []
    ml_indicators = []
    
    rule_tech = rule_report.technical_details
    
    # Rule indicators
    if not rule_tech.https:
        rule_indicators.append("Missing HTTPS")
    if rule_tech.contains_ip:
        rule_indicators.append("IP Address Host")
    if rule_tech.suspicious_keywords_found:
        rule_indicators.append("Suspicious Keywords")
    if rule_tech.url_length > 75:
        rule_indicators.append("Long URL Length")
    if rule_tech.subdomain_count > 2:
        rule_indicators.append("Excessive Subdomains")
    if rule_tech.suspicious_tld:
        rule_indicators.append("Suspicious TLD")
    if rule_tech.redirect_pattern_detected:
        rule_indicators.append("Redirection Pattern")
        
    # ML indicators
    if ml_feats.get("https") == 0:
        ml_indicators.append("Missing HTTPS")
    if ml_feats.get("contains_ip") == 1:
        ml_indicators.append("IP Address Host")
    if int(ml_feats.get("suspicious_keyword_count", 0)) > 0:
        ml_indicators.append("Suspicious Keywords")
    if int(ml_feats.get("url_length", 0)) > 75:
        ml_indicators.append("Long URL Length")
    if int(ml_feats.get("subdomain_count", 0)) > 2:
        ml_indicators.append("Excessive Subdomains")
    if ml_feats.get("suspicious_tld") == 1:
        ml_indicators.append("Suspicious TLD")
    if ml_feats.get("redirect_pattern") == 1:
        ml_indicators.append("Redirection Pattern")
    if float(ml_feats.get("entropy_score", 0.0)) > 4.2:
        ml_indicators.append("High URL Entropy")
    if int(ml_feats.get("query_parameter_count", 0)) > 2:
        ml_indicators.append("High Query Params")
    if int(ml_feats.get("path_depth", 0)) > 3:
        ml_indicators.append("Deep Path levels")
    if ml_feats.get("encoded_char_presence") == 1:
        ml_indicators.append("Percent Obfuscation")
        
    shared = list(set(rule_indicators) & set(ml_indicators))
    unique_rule = list(set(rule_indicators) - set(ml_indicators))
    unique_ml = list(set(ml_indicators) - set(rule_indicators))
    
    # Combined score (pessimistic)
    combined_score = max(rule_report.score, ml_score)
    
    # Combined status
    # Base combined status mapping is now irrelevant since final_verdict handles it.
        
    # Explainable comparison note (why engines differ or agree)
    if abs(rule_report.score - ml_score) <= 15:
        interpretation = "Both engines are aligned on the threat level. "
        if combined_score >= 70:
            interpretation += "Both engines identified high-risk malicious signals, advising against proceeding."
        elif combined_score >= 35:
            interpretation += "Both engines flagged minor anomalies, indicating a suspicious posture."
        else:
            interpretation += "Both engines confirmed the URL is clean, with no dangerous indicators detected."
    elif ml_score > rule_report.score:
        interpretation = f"The ML engine detected high URL entropy and deceptive structure patterns beyond the deterministic rules triggered (+{ml_score - rule_report.score} points difference)."
    else:
        interpretation = f"The Rule-based engine flagged a higher threat level (+{rule_report.score - ml_score} points difference) due to strict keyword/TLD rules or URL shortener flags that the ML model evaluated with lower statistical weight."

    # Recommendation logic will be handled after evaluate_final_verdict

    # Combined reasons (deduplicated)
    combined_reasons = sorted(list(set(rule_report.reasons) | set(ml_reasons)))

    # Pack Response
    scan_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    
    rule_res = {
        "score": rule_report.score,
        "status": rule_report.status,
        "reasons": rule_report.reasons
    }
    
    ml_res = {
        "score": ml_score,
        "status": ml_status,
        "reasons": ml_reasons,
        "confidence": ml_confidence
    }

    from app.services.intelligence_engine import classifier
    temp_details = {
        "is_whitelisted": rule_tech.is_whitelisted,
        "whitelist_reason": rule_tech.whitelist_reason,
        "is_blacklisted": rule_tech.is_blacklisted,
        "blacklist_source": rule_tech.blacklist_source,
        "blacklist_indicator": rule_tech.blacklist_source,
        "brand_spoof_detected": rule_tech.brand_spoof_detected,
        "suspected_brand": rule_tech.suspected_brand,
        "spoof_explanation": rule_tech.spoof_explanation,
        "spoof_type": rule_tech.spoof_type,
        "domain_age_days": domain_age_data["domain_age_days"] if domain_age_data else None,
        "domain": rule_tech.domain,
        "contains_ip": rule_tech.contains_ip,
        "subdomain_count": rule_tech.subdomain_count,
        "encoded_char_presence": ml_feats.get("encoded_char_presence") == 1,
        "redirect_pattern_detected": rule_tech.redirect_pattern_detected,
        "scoring_breakdown": rule_tech.scoring_breakdown,
        "ml_result": ml_res,
        "rule_based_result": rule_res,
        "score_difference": abs(rule_report.score - ml_score),
        "threat_feeds": threat_feeds_data
    }
    threat_category, secondary_tags = classifier.determine_category_and_tags(combined_score, temp_details, combined_reasons)
    final_verdict, conf_str, esc_trigger, esc_reason, combined_score, evidence_snapshot = classifier.evaluate_final_verdict(combined_score, temp_details)
    
    consensus_level = classifier.determine_consensus(combined_score, "comparison", temp_details)
    educational_insight = classifier.generate_educational_insight(threat_category, rule_tech.suspected_brand)
    
    from app.services import recommendation_engine
    recommendation = recommendation_engine.generate_recommendation(
        final_verdict=final_verdict,
        score=combined_score,
        reasons=combined_reasons,
        technical_details=temp_details
    )
    
    # Store interpretation note dynamically in scan_metadata
    if interpretation:
        if not request.scan_metadata:
            request.scan_metadata = {}
        request.scan_metadata["technical_notes"] = interpretation
        
    scan_journey = classifier.generate_scan_journey(request.url, rule_tech.domain, combined_score, temp_details, final_verdict, conf_str, consensus_level, esc_trigger, esc_reason, recommendation)

    details = TechnicalDetails(
        https=rule_tech.https,
        domain=rule_tech.domain,
        subdomain_count=rule_tech.subdomain_count,
        url_length=rule_tech.url_length,
        contains_ip=rule_tech.contains_ip,
        suspicious_keywords_found=rule_tech.suspicious_keywords_found,
        suspicious_tld=rule_tech.suspicious_tld,
        redirect_pattern_detected=rule_tech.redirect_pattern_detected,
        path_depth=int(ml_feats.get("path_depth", 0)),
        query_parameter_count=int(ml_feats.get("query_parameter_count", 0)),
        entropy_score=float(ml_feats.get("entropy_score", 0.0)),
        scoring_breakdown=rule_tech.scoring_breakdown, # Default rule breakdown
        model_outputs={"random_forest": {"score": ml_score}},
        rule_based_result=rule_res,
        ml_result=ml_res,
        shared_indicators=shared,
        unique_findings={"rule_based": unique_rule, "ml": unique_ml},
        score_difference=abs(rule_report.score - ml_score),
        
        # Phase 9 fields
        intelligence_flags=rule_report.technical_details.intelligence_flags,
        is_whitelisted=rule_report.technical_details.is_whitelisted,
        whitelist_reason=rule_report.technical_details.whitelist_reason,
        is_blacklisted=rule_report.technical_details.is_blacklisted,
        blacklist_source=rule_report.technical_details.blacklist_source,
        brand_spoof_detected=rule_report.technical_details.brand_spoof_detected,
        suspected_brand=rule_report.technical_details.suspected_brand,
        spoof_explanation=rule_report.technical_details.spoof_explanation,
        spoof_type=rule_report.technical_details.spoof_type,
        feature_importances=ml_feats.get("feature_importances"),
        ml_interpretation=ml_feats.get("ml_interpretation"),

        # Phase 10 fields
        threat_category=threat_category,
        secondary_threat_tags=secondary_tags,
        severity_tier=final_verdict,
        consensus_level=consensus_level,
        educational_insight=educational_insight,
        scan_journey=scan_journey,
        threat_feeds=threat_feeds_data
    )


    # 5. Populate Metadata
    if not request.scan_metadata:
        request.scan_metadata = {}
        
    if domain_age_data:
        request.scan_metadata["domain_intelligence"] = domain_age_data
        
    if threat_feeds_data:
        request.scan_metadata["threat_feeds"] = threat_feeds_data
        
    evidence = []
    if rule_tech.brand_spoof_detected:
        evidence.append("Brand Spoof Detection Triggered")
    if threat_category:
        evidence.append(f"{threat_category} Classification")
    evidence.append(f"Rule Engine Score: {rule_report.score}/100")
    evidence.append(f"ML Engine Score: {ml_score}/100")
    
    if threat_feeds_data and threat_feeds_data.get("matched_sources"):
        evidence.append("Threat Feed Result: Match Found")
    else:
        evidence.append("Threat Feed Result: No Match")
        
    if domain_age_data:
        status_str = domain_age_data.get("status", "unknown").capitalize()
        evidence.append(f"Domain Intelligence Status: {status_str}")

    request.scan_metadata["decision_snapshot"] = {
        "final_verdict": final_verdict,
        "confidence": conf_str,
        "consensus": consensus_level,
        "escalation_trigger": esc_trigger,
        "root_cause": esc_reason
    }
    request.scan_metadata["evidence_snapshot"] = evidence_snapshot
    request.scan_metadata["supporting_evidence"] = evidence

    response = ScanResponse(
        scan_id=scan_id,
        scan_type="comparison",
        scanned_url=request.url,
        status=final_verdict,
        score=combined_score,
        reasons=combined_reasons,
        technical_details=details,
        recommendation=recommendation,
        timestamp=timestamp,
        confidence=str(ml_confidence) if ml_confidence is not None else None,
        scan_source=request.scan_source,
        scan_metadata=request.scan_metadata
    )

    # 6. Save to Database
    if user_id:
        db_status = "safe"
        if final_verdict.upper() == "SUSPICIOUS":
            db_status = "suspicious"
        elif final_verdict.upper() in ["HIGH RISK", "CRITICAL", "DANGEROUS"]:
            db_status = "dangerous"
            
        db_tech_details = details.model_dump()
        db_tech_details["confidence"] = ml_confidence  # Store numerical confidence
        
        data = {
            "id": scan_id,
            "user_id": user_id,
            "url": request.url,
            "scan_type": "comparison",
            "status": db_status,
            "score": combined_score,
            "reasons": combined_reasons,
            "technical_details": db_tech_details,
            "recommendation": recommendation,
            "created_at": timestamp,
            "scan_source": request.scan_source,
            "scan_metadata": request.scan_metadata
        }
        
        logger.info("Inserting Comparison scan payload into Supabase: id=%s, user_id=%s, status=%s", scan_id, user_id, db_status)
        try:
            result = supabase.table("scans").insert(data).execute()
            logger.info("Comparison Insert successful. Response data count: %d", len(result.data) if result.data else 0)
        except Exception as db_err:
            logger.exception("Comparison database insert FAILED")
            
    return response


@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan_by_id(scan_id: str, user_id: str = Depends(get_current_user_id)):
    """
    Get a detailed threat report for a specific scan by ID.
    Enforces that the user is logged in and owns the scan.
    """
    # Fetch scan & verify ownership
    scan_data = get_authorized_scan(scan_id, user_id)
    
    # Map DB status (lowercase) to Pydantic/Frontend expected uppercase format (e.g. SAFE, SUSPICIOUS, DANGEROUS)
    status_upper = scan_data.get("status", "").upper()
    if not status_upper:
        status_upper = "SAFE" # Fallback
        
    tech_data = scan_data.get("technical_details", {})
    if isinstance(tech_data, str):
        try:
            tech_data = json.loads(tech_data)
        except Exception:
            logger.warning("Failed to parse technical_details JSON for scan %s", scan_id)
            tech_data = {}

    tech_details = TechnicalDetails(
        https=tech_data.get("https", False),
        domain=tech_data.get("domain", ""),
        subdomain_count=tech_data.get("subdomain_count", 0),
        url_length=tech_data.get("url_length", 0),
        contains_ip=tech_data.get("contains_ip", False),
        suspicious_keywords_found=tech_data.get("suspicious_keywords_found", []),
        suspicious_tld=tech_data.get("suspicious_tld", False),
        redirect_pattern_detected=tech_data.get("redirect_pattern_detected", False),
        path_depth=tech_data.get("path_depth"),
        query_parameter_count=tech_data.get("query_parameter_count"),
        entropy_score=tech_data.get("entropy_score"),
        scoring_breakdown=tech_data.get("scoring_breakdown"),
        rule_based_result=tech_data.get("rule_based_result"),
        ml_result=tech_data.get("ml_result"),
        shared_indicators=tech_data.get("shared_indicators"),
        unique_findings=tech_data.get("unique_findings"),
        score_difference=tech_data.get("score_difference"),
        
        # Phase 9 fields
        intelligence_flags=tech_data.get("intelligence_flags"),
        is_whitelisted=tech_data.get("is_whitelisted"),
        whitelist_reason=tech_data.get("whitelist_reason"),
        is_blacklisted=tech_data.get("is_blacklisted"),
        blacklist_source=tech_data.get("blacklist_source"),
        brand_spoof_detected=tech_data.get("brand_spoof_detected"),
        suspected_brand=tech_data.get("suspected_brand"),
        spoof_explanation=tech_data.get("spoof_explanation"),
        spoof_type=tech_data.get("spoof_type"),
        feature_importances=tech_data.get("feature_importances"),
        ml_interpretation=tech_data.get("ml_interpretation"),

        # Phase 10 fields
        threat_category=tech_data.get("threat_category"),
        secondary_threat_tags=tech_data.get("secondary_threat_tags"),
        severity_tier=tech_data.get("severity_tier"),
        consensus_level=tech_data.get("consensus_level"),
        educational_insight=tech_data.get("educational_insight"),
        scan_journey=tech_data.get("scan_journey"),
        threat_feeds=tech_data.get("threat_feeds")
    )


    conf = tech_data.get("confidence") or (tech_data.get("ml_result", {}).get("confidence") if tech_data.get("ml_result") else None)

    return ScanResponse(
        scan_id=scan_data.get("id"),
        scan_type=scan_data.get("scan_type", "rule-based"),
        scanned_url=scan_data.get("url", ""),
        status=status_upper,
        score=scan_data.get("score", 0),
        reasons=scan_data.get("reasons") or [],
        technical_details=tech_details,
        recommendation=scan_data.get("recommendation") or "",
        timestamp=str(scan_data.get("created_at", "")),
        confidence=str(conf) if conf is not None else None,
        scan_source=scan_data.get("scan_source", "manual"),
        scan_metadata=scan_data.get("scan_metadata", {})




    )

