from datetime import datetime, timezone
import uuid
from app.services.rule_engine import validators
from app.services.rule_engine import scoring
from app.schemas.scan import ScanResponse, TechnicalDetails

def analyze_url(url: str) -> ScanResponse:
    # 1. Validation
    normalized_url = validators.validate_and_normalize_url(url)
    
    # 2. Scoring
    score, reasons, raw_details = scoring.calculate_threat_score(normalized_url)
    
    # 3. Classification
    status = scoring.classify_score(score)
    
    # 4. Recommendation formatting
    from app.services import recommendation_engine
    recommendation = recommendation_engine.generate_recommendation(
        status=status,
        score=score,
        reasons=reasons,
        technical_details=raw_details
    )

    if not reasons and status == "SAFE":
        reasons.append("No common threats detected.")

    # 5. Pack Response
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
        scoring_breakdown=raw_details.get("scoring_breakdown")
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
