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
