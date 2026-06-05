from typing import Dict, Any, List
from app.services.analytics_engine.insights import calculate_insights
from app.services.intelligence_engine.classifier import determine_category_and_tags

def calculate_overview(scans: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes overall summary statistics and integrates calculated insights.
    """
    total_scans = len(scans)
    
    if total_scans == 0:
        return {
            "total_scans": 0,
            "safe_count": 0,
            "suspicious_count": 0,
            "dangerous_count": 0,
            "ml_scan_count": 0,
            "rule_based_count": 0,
            "manual_scan_count": 0,
            "qr_scan_count": 0,
            "average_threat_score": 0.0,
            "highest_threat_score": 0,
            "latest_scan_timestamp": None,
            "total_ml_percentage": 0.0,
            "total_rule_based_percentage": 0.0,
            "threat_category_counts": {},
            "spoofed_brand_counts": {},
            "severity_tier_counts": {
                "SAFE": 0,
                "SUSPICIOUS": 0,
                "HIGH RISK": 0,
                "CRITICAL": 0,
                "MALICIOUS": 0
            },
            "insights": calculate_insights(scans)
        }
    
    safe_count = 0
    suspicious_count = 0
    dangerous_count = 0
    ml_scan_count = 0
    rule_based_count = 0
    manual_scan_count = 0
    qr_scan_count = 0
    total_score = 0
    highest_threat_score = 0
    latest_scan_timestamp = None
    
    threat_category_counts = {}
    spoofed_brand_counts = {}
    severity_tier_counts = {
        "SAFE": 0,
        "SUSPICIOUS": 0,
        "HIGH RISK": 0,
        "CRITICAL": 0,
        "MALICIOUS": 0
    }
    
    for scan in scans:
        status = (scan.get("status") or "").upper().strip()
        if status == "SAFE":
            safe_count += 1
        elif status == "SUSPICIOUS":
            suspicious_count += 1
        elif status in ("HIGH RISK", "CRITICAL", "MALICIOUS", "DANGEROUS"):
            dangerous_count += 1
            
        scan_type = scan.get("scan_type") or "rule-based"
        if scan_type == "ml":
            ml_scan_count += 1
        else:
            rule_based_count += 1
            
        score = scan.get("score") or 0
        total_score += score
        if score > highest_threat_score:
            highest_threat_score = score
            
        scan_source = scan.get("scan_source") or "manual"
        if scan_source == "qr":
            qr_scan_count += 1
        else:
            manual_scan_count += 1
            
        created_at = scan.get("created_at")
        if created_at:
            if not latest_scan_timestamp or created_at > latest_scan_timestamp:
                latest_scan_timestamp = created_at
                
        # Phase 10 aggregations
        tech = scan.get("technical_details") or {}
        if not isinstance(tech, dict):
            tech = {}
            
        reasons = scan.get("reasons") or []
        is_blacklisted = tech.get("is_blacklisted", False)
        
        # 1. Severity tier / Final Verdict
        metadata = scan.get("scan_metadata") or {}
        sev = metadata.get("final_verdict") or tech.get("severity_tier") or status
        
        # Legacy mapping if old severity is found
        legacy_map = {"Informational": "SAFE", "Low": "SUSPICIOUS", "Medium": "HIGH RISK", "High": "CRITICAL", "Critical": "MALICIOUS"}
        if sev in legacy_map:
            sev = legacy_map[sev]
            
        sev = sev.upper()
        if sev in severity_tier_counts:
            severity_tier_counts[sev] += 1
                
        # 2. Threat Category
        cat = tech.get("threat_category")
        if not cat:
            cat, _ = determine_category_and_tags(score, tech, reasons)
        if cat:
            threat_category_counts[cat] = threat_category_counts.get(cat, 0) + 1
            
        # 3. Spoofed Brand
        brand = tech.get("suspected_brand")
        if brand:
            # standardise brand casing
            brand_name = brand.capitalize()
            spoofed_brand_counts[brand_name] = spoofed_brand_counts.get(brand_name, 0) + 1
                
    average_threat_score = round(total_score / total_scans, 2)
    total_ml_percentage = round((ml_scan_count / total_scans) * 100, 2)
    total_rule_based_percentage = round((rule_based_count / total_scans) * 100, 2)
    
    return {
        "total_scans": total_scans,
        "safe_count": safe_count,
        "suspicious_count": suspicious_count,
        "dangerous_count": dangerous_count,
        "ml_scan_count": ml_scan_count,
        "rule_based_count": rule_based_count,
        "manual_scan_count": manual_scan_count,
        "qr_scan_count": qr_scan_count,
        "average_threat_score": average_threat_score,
        "highest_threat_score": highest_threat_score,
        "latest_scan_timestamp": latest_scan_timestamp,
        "total_ml_percentage": total_ml_percentage,
        "total_rule_based_percentage": total_rule_based_percentage,
        "threat_category_counts": threat_category_counts,
        "spoofed_brand_counts": spoofed_brand_counts,
        "severity_tier_counts": severity_tier_counts,
        "insights": calculate_insights(scans)
    }
