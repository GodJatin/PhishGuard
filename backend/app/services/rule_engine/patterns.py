import re
import urllib.parse
from typing import List

def extract_domain(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    return parsed.netloc.split(':')[0]  # Remove port if present

def is_ip_address(domain: str) -> bool:
    # Basic IPv4 regex
    ipv4_pattern = re.compile(r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$")
    # Basic IPv6 regex (simplistic)
    ipv6_pattern = re.compile(r"^(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}$")
    
    return bool(ipv4_pattern.match(domain) or ipv6_pattern.match(domain))

def count_subdomains(domain: str) -> int:
    # A standard domain (e.g., example.com) has 2 parts, so 0 subdomains.
    # www.example.com has 3 parts -> 1 subdomain.
    parts = domain.split('.')
    if len(parts) > 2:
        return len(parts) - 2
    return 0

def find_suspicious_keywords(url: str, keywords: List[str]) -> List[str]:
    url_lower = url.lower()
    found = []
    for kw in keywords:
        if kw in url_lower:
            found.append(kw)
    return found

def has_suspicious_tld(domain: str, tlds: List[str]) -> bool:
    for tld in tlds:
        if domain.endswith(tld):
            return True
    return False

def is_url_shortener(domain: str, shorteners: List[str]) -> bool:
    for shortener in shorteners:
        if domain == shortener or domain.endswith('.' + shortener):
            return True
    return False

def has_at_symbol(url: str) -> bool:
    # @ symbol in URL often used to mask real domain (e.g. http://safe.com@attacker.com)
    parsed = urllib.parse.urlparse(url)
    return '@' in parsed.netloc

def has_double_slash_in_path(url: str) -> bool:
    parsed = urllib.parse.urlparse(url)
    return '//' in parsed.path
