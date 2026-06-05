from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Optional
import re

class ScanRequest(BaseModel):
    url: str = Field(
        ...,
        min_length=1,
        max_length=2048,
        description="The URL to scan. Must be between 1 and 2048 characters."
    )
    scan_source: str = Field("manual", description="Source of the scan (manual or qr).")
    scan_metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata for the scan.")

    @field_validator("url")
    @classmethod
    def reject_dangerous_schemes(cls, v: str) -> str:
        """Reject clearly dangerous or non-HTTP(S) schemes before any processing."""
        stripped = v.strip().lower()
        dangerous_prefixes = ("javascript:", "data:", "vbscript:", "file:", "about:", "blob:")
        for prefix in dangerous_prefixes:
            if stripped.startswith(prefix):
                raise ValueError(f"Dangerous URL scheme detected and rejected.")
        return v.strip()

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
    model_outputs: Optional[Dict[str, Any]] = None

    # Layered Threat Intelligence (Phase 9)
    intelligence_flags: Optional[List[str]] = None
    is_whitelisted: Optional[bool] = None
    whitelist_reason: Optional[str] = None
    is_blacklisted: Optional[bool] = None
    blacklist_source: Optional[str] = None
    brand_spoof_detected: Optional[bool] = None
    suspected_brand: Optional[str] = None
    spoof_explanation: Optional[str] = None
    spoof_type: Optional[str] = None
    feature_importances: Optional[List[Dict[str, Any]]] = None
    ml_interpretation: Optional[str] = None

    # Analyst Threat Intelligence Metrics (Phase 10)
    threat_category: Optional[str] = None
    secondary_threat_tags: Optional[List[str]] = None
    severity_tier: Optional[str] = None
    consensus_level: Optional[str] = None
    educational_insight: Optional[str] = None
    scan_journey: Optional[List[Dict[str, Any]]] = None

    # Threat Intelligence Feeds (Phase 11)
    threat_feeds: Optional[Dict[str, Any]] = None



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
    confidence: Optional[str] = None
    
    # Metadata
    scan_source: str = "manual"
    scan_metadata: Dict[str, Any] = Field(default_factory=dict)

