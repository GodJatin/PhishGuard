import logging
from typing import Dict, Any, List, Tuple
from app.services.model_engine import feature_extractor, model_loader
from app.services.rule_engine import validators

logger = logging.getLogger(__name__)

def generate_explainability_findings(feats: Dict[str, Any]) -> List[str]:
    """
    Maps extracted feature values to human-readable explanations.
    """
    findings = []
    
    # 1. HTTP/HTTPS
    if feats["https"] == 0:
        findings.append("Unencrypted connection detected (HTTP).")
        
    # 2. IP address
    if feats["contains_ip"] == 1:
        findings.append("URL domain is an IP address, hiding real identity.")
        
    # 3. Suspicious keywords
    kw_count = int(feats["suspicious_keyword_count"])
    if kw_count >= 2:
        findings.append(f"Multiple phishing-related keywords found ({kw_count}).")
    elif kw_count == 1:
        findings.append("Phishing-related keyword detected in URL.")
        
    # 4. URL length
    if feats["url_length"] > 75:
        findings.append("Excessive URL complexity and length detected.")
        
    # 5. Subdomain count
    sub_count = int(feats["subdomain_count"])
    if sub_count >= 3:
        findings.append(f"Unusual subdomain structure detected ({sub_count} subdomains).")
        
    # 6. Suspicious TLD
    if feats["suspicious_tld"] == 1:
        findings.append("Uses a top-level domain (TLD) frequently abused for attacks.")
        
    # 7. Credential masking (@)
    if feats["at_symbol"] == 1:
        findings.append("URL contains '@' symbol, which can hide the actual destination.")
        
    # 8. Redirect pattern (//)
    if feats["redirect_pattern"] == 1:
        findings.append("Double slash found in URL path; potential open redirect abuse.")
        
    # 9. Path depth
    depth = int(feats["path_depth"])
    if depth > 3:
        findings.append(f"Deep directory structure detected (depth of {depth}).")
        
    # 10. Query parameters
    q_count = int(feats["query_parameter_count"])
    if q_count >= 3:
        findings.append(f"High number of query parameters detected ({q_count}).")
        
    # 11. Encoded characters
    if feats["encoded_char_presence"] == 1:
        findings.append("Obfuscated or percent-encoded characters detected.")
        
    # 12. Entropy score
    entropy = float(feats["entropy_score"])
    if entropy > 4.5:
        findings.append(f"High entropy suspicious pattern ({entropy:.2f} score indicates randomness/obfuscation).")
        
    if not findings:
        findings.append("No obvious anomalies detected in URL features.")
        
    return findings

def get_recommendation(status: str) -> str:
    """
    Returns action recommendation based on classification.
    """
    if status == "SAFE":
        return "Safe to proceed. The ML model did not detect any significant signs of phishing."
    elif status == "SUSPICIOUS":
        return "Proceed with caution. The ML model detected mild anomalies. Avoid entering sensitive credentials."
    else:
        return "Do not visit this URL. The ML model detected high probability of phishing or credential theft."

def calculate_ml_scoring_breakdown(feats: Dict[str, Any], score: int) -> List[Dict[str, Any]]:
    if score == 0:
        return []
        
    raw_breakdown = []
    
    # 1. Scheme Check
    if feats.get("https") == 0:
        raw_breakdown.append({"rule": "Missing HTTPS encryption", "weight": 15})
        
    # 2. IP Address
    if feats.get("contains_ip") == 1:
        raw_breakdown.append({"rule": "IP address domain host", "weight": 30})
        
    # 3. Keywords
    kw_count = int(feats.get("suspicious_keyword_count", 0))
    if kw_count > 0:
        raw_breakdown.append({"rule": f"Suspicious keywords ({kw_count} keywords)", "weight": kw_count * 15})
        
    # 4. Subdomains
    sub_count = int(feats.get("subdomain_count", 0))
    if sub_count > 2:
        raw_breakdown.append({"rule": f"Excessive subdomain hierarchy ({sub_count} subdomains)", "weight": sub_count * 5})
        
    # 5. Hyphens
    hyphens = int(feats.get("hyphen_count", 0))
    if hyphens > 3:
        raw_breakdown.append({"rule": f"Excessive use of hyphens ({hyphens} hyphens)", "weight": hyphens * 3})
        
    # 6. Digits
    digits = int(feats.get("digit_count", 0))
    if digits > 5:
        raw_breakdown.append({"rule": f"High digit density ({digits} digits)", "weight": digits * 2})
        
    # 7. Special characters
    special = int(feats.get("special_char_count", 0))
    if special > 10:
        raw_breakdown.append({"rule": f"High special character count ({special} chars)", "weight": special * 1})
        
    # 8. Length
    length = int(feats.get("url_length", 0))
    if length > 75:
        raw_breakdown.append({"rule": f"Excessive URL length ({length} chars)", "weight": 10})
        
    # 9. Entropy
    entropy = float(feats.get("entropy_score", 0.0))
    if entropy > 4.2:
        raw_breakdown.append({"rule": f"High URL string entropy ({entropy:.2f})", "weight": int(entropy * 3)})
        
    # 10. TLD
    if feats.get("suspicious_tld") == 1:
        raw_breakdown.append({"rule": "Suspicious TLD registered", "weight": 15})
        
    # 11. Query Params
    qp = int(feats.get("query_parameter_count", 0))
    if qp > 2:
        raw_breakdown.append({"rule": f"High query parameter density ({qp} parameters)", "weight": qp * 3})
        
    # 12. At Symbol
    if feats.get("at_symbol") == 1:
        raw_breakdown.append({"rule": "Credential obfuscation (@ symbol)", "weight": 20})
        
    # 13. Path Depth
    depth = int(feats.get("path_depth", 0))
    if depth > 3:
        raw_breakdown.append({"rule": f"Excessive path depth ({depth} levels)", "weight": depth * 2})
        
    # 14. Encoded chars
    if feats.get("encoded_char_presence") == 1:
        raw_breakdown.append({"rule": "Percent-encoding obfuscation", "weight": 10})
        
    # 15. Redirect pattern
    if feats.get("redirect_pattern") == 1:
        raw_breakdown.append({"rule": "Redirection pattern (// in path)", "weight": 15})
        
    # If no raw features triggered but score > 0, fallback
    if not raw_breakdown:
        raw_breakdown.append({"rule": "Model classification probability", "weight": score})
        
    # Scale weights to sum exactly to score
    total_weight = sum(item["weight"] for item in raw_breakdown)
    
    breakdown = []
    accumulated_score = 0
    for i, item in enumerate(raw_breakdown):
        if i == len(raw_breakdown) - 1:
            pts = score - accumulated_score
        else:
            pts = int(round((item["weight"] / total_weight) * score))
            accumulated_score += pts
        
        if pts > 0 or score == 0:
            breakdown.append({
                "rule": item["rule"],
                "points": pts
            })
            
    return breakdown

FEATURE_LABELS = {
    "url_length": "URL Length",
    "subdomain_count": "Subdomain Structure",
    "https": "SSL/HTTPS Encryption",
    "contains_ip": "IP-based Hostname",
    "suspicious_keyword_count": "Deceptive Keywords",
    "special_char_count": "Special Character Density",
    "digit_count": "Digit Density",
    "hyphen_count": "Hyphen Count",
    "redirect_pattern": "Redirection Patterns",
    "suspicious_tld": "Untrusted Top-Level Domain",
    "encoded_char_presence": "Encoded/Obfuscated Characters",
    "at_symbol": "Credential Masking (@)",
    "path_depth": "Directory Path Depth",
    "query_parameter_count": "Query Parameters",
    "entropy_score": "URL String Randomness (Entropy)"
}

def extract_feature_importances(model, feats: Dict[str, Any], score: int) -> Tuple[List[Dict[str, Any]], str]:
    """
    Computes feature importances and builds a human-readable explanation and summary.
    """
    importances = getattr(model, "feature_importances_", None)
    if importances is None:
        importances = [1.0 / len(feature_extractor.FEATURE_NAMES)] * len(feature_extractor.FEATURE_NAMES)
        
    activated_features = {}
    for name in feature_extractor.FEATURE_NAMES:
        val = feats.get(name, 0)
        is_active = False
        if name == "https" and val == 0:
            is_active = True
        elif name == "contains_ip" and val == 1:
            is_active = True
        elif name == "suspicious_keyword_count" and val > 0:
            is_active = True
        elif name == "redirect_pattern" and val == 1:
            is_active = True
        elif name == "suspicious_tld" and val == 1:
            is_active = True
        elif name == "encoded_char_presence" and val == 1:
            is_active = True
        elif name == "at_symbol" and val == 1:
            is_active = True
        elif name == "subdomain_count" and val > 2:
            is_active = True
        elif name == "url_length" and val > 75:
            is_active = True
        elif name == "special_char_count" and val > 10:
            is_active = True
        elif name == "digit_count" and val > 5:
            is_active = True
        elif name == "hyphen_count" and val > 3:
            is_active = True
        elif name == "path_depth" and val > 3:
            is_active = True
        elif name == "query_parameter_count" and val > 2:
            is_active = True
        elif name == "entropy_score" and val > 4.2:
            is_active = True
            
        activated_features[name] = is_active

    raw_influences = []
    for idx, name in enumerate(feature_extractor.FEATURE_NAMES):
        importance = importances[idx]
        is_active = activated_features.get(name, False)
        # Dynamic weighting based on active feature status
        influence = importance * (2.5 if is_active else 0.2)
        raw_influences.append((name, influence))
        
    raw_influences.sort(key=lambda x: x[1], reverse=True)
    top_features = raw_influences[:6]
    total_influence = sum(inf for _, inf in top_features)
    
    formatted_features = []
    for name, inf in top_features:
        pct = (inf / total_influence) * 100 if total_influence > 0 else 0
        formatted_features.append({
            "feature": name,
            "label": FEATURE_LABELS.get(name, name),
            "contribution_pct": round(pct, 1),
            "is_active": activated_features.get(name, False)
        })
        
    formatted_features.sort(key=lambda x: x["contribution_pct"], reverse=True)
    
    active_labels = [f["label"].lower() for f in formatted_features if f["is_active"]][:3]
    if score < 35:
        interpretation = "Clean structural attributes and secure connection indicate a safe URL."
    else:
        if active_labels:
            if len(active_labels) >= 2:
                interpretation = f"High {active_labels[0]} and deceptive {active_labels[1]} significantly increased the phishing probability."
            else:
                interpretation = f"Deceptive {active_labels[0]} patterns detected in the URL structure increased the phishing probability."
        else:
            interpretation = "ML classification indicates potential phishing patterns in URL string layout."
            
    return formatted_features, interpretation

def predict_url(url: str) -> Tuple[str, int, float, Dict[str, Any], List[str], str]:
    """
    Runs model inference on a URL.
    Returns a tuple of:
    (status, score, confidence, features_dict, reasons_list, recommendation)
    """
    # 1. Normalize/validate URL
    normalized_url = validators.validate_and_normalize_url(url)
    
    # 2. Extract features
    feats = feature_extractor.extract_features(normalized_url)
    vector = [float(feats[name]) for name in feature_extractor.FEATURE_NAMES]
    
    # 3. Load model singleton
    try:
        model, metadata = model_loader.load_model_and_metadata()
    except Exception as e:
        logger.error(f"Failed to load ML model in predict_url: {e}")
        # Fallback to a rule-like deterministic scoring if model fails to load, or raise error.
        # Since we must handle safely: missing model, corrupt pickle, incompatible sklearn version,
        # we will raise a RuntimeError so the route can return a clean 503 Service Unavailable or fallback.
        raise RuntimeError(f"ML Classification engine is currently unavailable: {e}") from e

    # 4. Predict
    # probs shape: [prob_safe, prob_phishing]
    probs = model.predict_proba([vector])[0]
    phishing_prob = float(probs[1])
    
    # Deterministic threat score out of 100
    score = int(phishing_prob * 100)
    
    # Map probabilities to status:
    # Low: < 35 -> SAFE
    # Medium: 35 to < 70 -> SUSPICIOUS
    # High: >= 70 -> DANGEROUS
    if score < 35:
        status = "SAFE"
        confidence = float(probs[0]) # probability of being SAFE
    elif score < 70:
        status = "SUSPICIOUS"
        # For suspicious, confidence is the higher of the two
        confidence = float(max(probs))
    else:
        status = "DANGEROUS"
        confidence = float(probs[1]) # probability of being PHISHING/DANGEROUS
        
    # 5. Explainability
    reasons = generate_explainability_findings(feats)
    
    # Generate scoring breakdown
    feats["scoring_breakdown"] = calculate_ml_scoring_breakdown(feats, score)
    
    # Phase 9: Feature Importance & ML Interpretation
    importances_list, interpretation = extract_feature_importances(model, feats, score)
    feats["feature_importances"] = importances_list
    feats["ml_interpretation"] = interpretation
    
    # 6. Contextual Recommendation mapping
    from app.services.rule_engine import patterns, constants
    from app.services import recommendation_engine
    
    keywords_found = patterns.find_suspicious_keywords(normalized_url, constants.SUSPICIOUS_KEYWORDS)
    tech_details_comp = {
        "https": feats.get("https") == 1,
        "contains_ip": feats.get("contains_ip") == 1,
        "suspicious_keywords_found": keywords_found,
        "suspicious_keyword_count": int(feats.get("suspicious_keyword_count", 0)),
        "subdomain_count": int(feats.get("subdomain_count", 0)),
        "suspicious_tld": feats.get("suspicious_tld") == 1,
        "redirect_pattern_detected": feats.get("redirect_pattern") == 1,
        "at_symbol": feats.get("at_symbol") == 1,
        "encoded_char_presence": feats.get("encoded_char_presence") == 1,
        "url_length": int(feats.get("url_length", 0))
    }
    
    recommendation = recommendation_engine.generate_recommendation(
        status=status,
        score=score,
        reasons=reasons,
        technical_details=tech_details_comp
    )
    
    return status, score, confidence, feats, reasons, recommendation
