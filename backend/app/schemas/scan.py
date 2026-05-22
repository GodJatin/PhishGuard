from pydantic import BaseModel, HttpUrl, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class ScanRequest(BaseModel):
    url: str = Field(..., description="The URL to scan.")

class TechnicalDetails(BaseModel):
    https: bool
    domain: str
    subdomain_count: int
    url_length: int
    contains_ip: bool
    suspicious_keywords_found: List[str]
    suspicious_tld: bool
    redirect_pattern_detected: bool
    # ML-specific features (optional to keep backwards compatibility)
    path_depth: Optional[int] = None
    query_parameter_count: Optional[int] = None
    entropy_score: Optional[float] = None
    # Explainable scoring
    scoring_breakdown: Optional[List[Dict[str, Any]]] = None
    # Comparison-specific fields
    rule_based_result: Optional[Dict[str, Any]] = None
    ml_result: Optional[Dict[str, Any]] = None
    shared_indicators: Optional[List[str]] = None
    unique_findings: Optional[Dict[str, List[str]]] = None
    score_difference: Optional[int] = None

class ScanResponse(BaseModel):
    scan_id: str
    scan_type: str
    scanned_url: str
    status: str
    score: int
    reasons: List[str]
    technical_details: TechnicalDetails
    recommendation: str
    timestamp: str
    # ML-specific confidence (optional)
    confidence: Optional[float] = None

