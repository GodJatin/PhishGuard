from typing import Dict, Any, List
from app.services.analytics_engine.insights import calculate_insights

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
            "average_threat_score": 0.0,
            "highest_threat_score": 0,
            "latest_scan_timestamp": None,
            "total_ml_percentage": 0.0,
            "total_rule_based_percentage": 0.0,
            "insights": calculate_insights(scans)
        }
    
    safe_count = 0
    suspicious_count = 0
    dangerous_count = 0
    ml_scan_count = 0
    rule_based_count = 0
    total_score = 0
    highest_threat_score = 0
    latest_scan_timestamp = None
    
    for scan in scans:
        status = (scan.get("status") or "").lower().strip()
        if status == "safe":
            safe_count += 1
        elif status == "suspicious":
            suspicious_count += 1
        elif status == "dangerous":
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
            
        created_at = scan.get("created_at")
        if created_at:
            if not latest_scan_timestamp or created_at > latest_scan_timestamp:
                latest_scan_timestamp = created_at
                
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
        "average_threat_score": average_threat_score,
        "highest_threat_score": highest_threat_score,
        "latest_scan_timestamp": latest_scan_timestamp,
        "total_ml_percentage": total_ml_percentage,
        "total_rule_based_percentage": total_rule_based_percentage,
        "insights": calculate_insights(scans)
    }
