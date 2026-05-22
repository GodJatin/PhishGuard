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
    
    # 6. Recommendation
    recommendation = get_recommendation(status)
    
    return status, score, confidence, feats, reasons, recommendation
