from collections import Counter
from typing import List, Dict, Any

def calculate_insights(scans: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes threat intelligence insights from the user's scan history.
    """
    if not scans:
        return {
            "most_common_keyword": "None",
            "most_detected_pattern": "None",
            "highest_threat_score": 0,
            "most_used_engine": "None"
        }
    
    keyword_counter = Counter()
    reason_counter = Counter()
    engine_counter = Counter()
    max_score = 0
    
    for scan in scans:
        # Score
        score = scan.get("score") or 0
        if score > max_score:
            max_score = score
            
        # Scan Type (Engine)
        engine = scan.get("scan_type") or "rule-based"
        engine_counter[engine] += 1
        
        # Reasons / Indicators
        reasons = scan.get("reasons") or []
        for r in reasons:
            if r:
                reason_counter[r.strip()] += 1
                
        # Keywords
        tech = scan.get("technical_details") or {}
        if isinstance(tech, dict):
            keywords = tech.get("suspicious_keywords_found") or []
            for k in keywords:
                if k:
                    keyword_counter[k.lower().strip()] += 1
                    
    most_common_keyword = keyword_counter.most_common(1)[0][0] if keyword_counter else "None"
    most_common_reason = reason_counter.most_common(1)[0][0] if reason_counter else "None"
    most_used_engine = engine_counter.most_common(1)[0][0] if engine_counter else "None"
    
    # Map to nice labels
    if most_used_engine == "ml":
        engine_label = "Pretrained ML Engine"
    elif most_used_engine == "rule-based":
        engine_label = "Rule-Based Engine"
    else:
        engine_label = most_used_engine.capitalize()
        
    return {
        "most_common_keyword": most_common_keyword,
        "most_detected_pattern": most_common_reason,
        "highest_threat_score": max_score,
        "most_used_engine": engine_label
    }
