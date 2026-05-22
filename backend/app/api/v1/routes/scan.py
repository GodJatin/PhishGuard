import logging
from fastapi import APIRouter, HTTPException, Header, Depends
from app.schemas.scan import ScanRequest, ScanResponse, TechnicalDetails
from app.services.rule_engine import scanner
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
        logger.info("JWT token extracted (first 20 chars): %s...", token[:20])
        try:
            user_resp = supabase.auth.get_user(token)
            if user_resp and user_resp.user:
                user_id = user_resp.user.id
                logger.info("Authenticated user_id: %s", user_id)
            else:
                logger.warning("get_user returned empty user — token may be expired or invalid.")
        except Exception as auth_err:
            logger.exception("JWT verification failed")
    else:
        logger.info("No valid Authorization header — scan will not be persisted.")

    # --- Step 3: Persist to Supabase ---
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
            "created_at": report.timestamp
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
        logger.info("ML Analysis complete. Score=%d, Status=%s, Confidence=%.2f", score, status, confidence)
    except ValueError as ve:
        logger.warning("ML Validation error: %s", ve)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Unexpected error during ML analysis")
        raise HTTPException(status_code=503, detail=f"ML Engine currently unavailable: {str(e)}")

    # 2. Extract JWT and verify user (bypass RLS for save)
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            user_resp = supabase.auth.get_user(token)
            if user_resp and user_resp.user:
                user_id = user_resp.user.id
        except Exception as auth_err:
            logger.exception("JWT verification failed for ML scan")

    # 3. Pack Response
    import uuid
    from datetime import datetime, timezone
    scan_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    # Extract keywords found using rule_engine constants to match schema expectation
    from app.services.rule_engine import patterns, constants
    domain = patterns.extract_domain(request.url)
    keywords_found = patterns.find_suspicious_keywords(request.url, constants.SUSPICIOUS_KEYWORDS)

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
        entropy_score=float(feats["entropy_score"])
    )

    response = ScanResponse(
        scan_id=scan_id,
        scan_type="ml",
        scanned_url=request.url,
        status=status,
        score=score,
        reasons=reasons,
        technical_details=details,
        recommendation=recommendation,
        timestamp=timestamp,
        confidence=confidence
    )

    # 4. Save to Database
    if user_id:
        db_status = status.lower()
        db_tech_details = details.model_dump()
        db_tech_details["confidence"] = confidence  # Store confidence inside JSON
        
        data = {
            "id": scan_id,
            "user_id": user_id,
            "url": request.url,
            "scan_type": "ml",
            "status": db_status,          # safe / suspicious / dangerous
            "score": score,
            "reasons": reasons,
            "technical_details": db_tech_details,
            "recommendation": recommendation,
            "created_at": timestamp
        }
        
        logger.info("Inserting ML scan payload into Supabase: id=%s, user_id=%s, status=%s", scan_id, user_id, db_status)
        try:
            result = supabase.table("scans").insert(data).execute()
            logger.info("ML Insert successful. Response data count: %d", len(result.data) if result.data else 0)
        except Exception as db_err:
            logger.exception("ML database insert FAILED")
            
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
        import json
        try:
            tech_data = json.loads(tech_data)
        except Exception:
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
        entropy_score=tech_data.get("entropy_score")
    )

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
        confidence=tech_data.get("confidence")
    )




