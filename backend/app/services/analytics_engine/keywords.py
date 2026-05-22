from collections import Counter
from typing import List, Dict, Any

def calculate_keywords(scans: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Normalizes keyword casings and repeated indicators to return top 5-10 frequent matches.
    """
    keyword_counter = Counter()
    indicator_counter = Counter()
    
    for scan in scans:
        # Normalize and count phishing reasons/indicators
        reasons = scan.get("reasons") or []
        for r in reasons:
            if not r:
                continue
            # Normalize casing, strip whitespace, and trailing periods
            norm_r = r.strip().rstrip('.')
            if norm_r:
                indicator_counter[norm_r] += 1
                
        # Normalize and count suspicious keywords
        tech = scan.get("technical_details") or {}
        if isinstance(tech, dict):
            keywords = tech.get("suspicious_keywords_found") or []
            for k in keywords:
                if not k:
                    continue
                norm_k = k.lower().strip()
                if norm_k:
                    keyword_counter[norm_k] += 1
                    
    top_keywords = [{"keyword": k, "count": c} for k, c in keyword_counter.most_common(10)]
    top_indicators = [{"indicator": i, "count": c} for i, c in indicator_counter.most_common(10)]
    
    return {
        "keywords": top_keywords,
        "indicators": top_indicators
    }
