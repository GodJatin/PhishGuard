import urllib.parse
import re
import math
from collections import Counter
from typing import Dict, Any, List, Tuple
from app.services.rule_engine import patterns, constants

# The exact order of features expected by the RandomForest model
FEATURE_NAMES = [
    "url_length",
    "subdomain_count",
    "https",
    "contains_ip",
    "suspicious_keyword_count",
    "special_char_count",
    "digit_count",
    "hyphen_count",
    "redirect_pattern",
    "suspicious_tld",
    "encoded_char_presence",
    "at_symbol",
    "path_depth",
    "query_parameter_count",
    "entropy_score"
]

def calculate_entropy(s: str) -> float:
    """
    Calculates Shannon Entropy of a string to detect randomized/complex URL patterns.
    """
    if not s:
        return 0.0
    entropy = 0.0
    cnt = Counter(s)
    total = len(s)
    for char, count in cnt.items():
        p = count / total
        entropy -= p * math.log2(p)
    return float(entropy)

def extract_features(url: str) -> Dict[str, Any]:
    """
    Extracts 15 lightweight, deterministic features from the URL.
    Returns a dictionary of raw feature values.
    """
    parsed = urllib.parse.urlparse(url)
    domain = patterns.extract_domain(url)
    
    # 1. url_length
    url_length = len(url)
    
    # 2. subdomain_count
    subdomain_count = patterns.count_subdomains(domain)
    
    # 3. https
    https = 1 if parsed.scheme == "https" else 0
    
    # 4. contains_ip
    contains_ip = 1 if patterns.is_ip_address(domain) else 0
    
    # 5. suspicious_keyword_count
    keywords_found = patterns.find_suspicious_keywords(url, constants.SUSPICIOUS_KEYWORDS)
    suspicious_keyword_count = len(keywords_found)
    
    # 6. special_char_count: characters that are frequently abused or represent complexity
    special_chars = "-_?=&%+@/."
    special_char_count = sum(1 for c in url if c in special_chars)
    
    # 7. digit_count
    digit_count = sum(1 for c in url if c.isdigit())
    
    # 8. hyphen_count
    hyphen_count = url.count('-')
    
    # 9. redirect_pattern: // in path
    redirect_pattern = 1 if patterns.has_double_slash_in_path(url) else 0
    
    # 10. suspicious_tld
    suspicious_tld = 1 if patterns.has_suspicious_tld(domain, constants.SUSPICIOUS_TLDS) else 0
    
    # 11. encoded_char_presence: checks for percent encoding pattern, e.g. %20
    encoded_char_presence = 1 if len(re.findall(r'%[0-9a-fA-F]{2}', url)) > 0 else 0
    
    # 12. at_symbol: @ in netloc
    at_symbol = 1 if patterns.has_at_symbol(url) else 0
    
    # 13. path_depth: number of segments in URL path
    path_depth = len([seg for seg in parsed.path.split('/') if seg])
    
    # 14. query_parameter_count: number of query parameter pairs
    query_parameter_count = len(urllib.parse.parse_qsl(parsed.query))
    
    # 15. entropy_score
    entropy_score = calculate_entropy(url)
    
    return {
        "url_length": url_length,
        "subdomain_count": subdomain_count,
        "https": https,
        "contains_ip": contains_ip,
        "suspicious_keyword_count": suspicious_keyword_count,
        "special_char_count": special_char_count,
        "digit_count": digit_count,
        "hyphen_count": hyphen_count,
        "redirect_pattern": redirect_pattern,
        "suspicious_tld": suspicious_tld,
        "encoded_char_presence": encoded_char_presence,
        "at_symbol": at_symbol,
        "path_depth": path_depth,
        "query_parameter_count": query_parameter_count,
        "entropy_score": entropy_score
    }

def get_features_vector(url: str) -> List[float]:
    """
    Extracts and returns the features as a flat numeric list in the exact order required by the model.
    """
    feats = extract_features(url)
    return [float(feats[name]) for name in FEATURE_NAMES]
