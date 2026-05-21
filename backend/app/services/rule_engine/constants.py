# Constants for Rule-Based Phishing Detection

# Status Thresholds
SCORE_SAFE_MAX = 30
SCORE_SUSPICIOUS_MAX = 70

# Scoring Weights
WEIGHT_NO_HTTPS = 15
WEIGHT_IP_ADDRESS = 30
WEIGHT_SUSPICIOUS_TLD = 15
WEIGHT_SUSPICIOUS_KEYWORD = 10  # per keyword
WEIGHT_LONG_URL = 10
WEIGHT_MANY_SUBDOMAINS = 15
WEIGHT_AT_SYMBOL = 20
WEIGHT_URL_SHORTENER = 15
WEIGHT_DOUBLE_SLASH_PATH = 10

# Threshold values
MAX_SAFE_URL_LENGTH = 75
MAX_SAFE_SUBDOMAINS = 2

# Suspicious keywords commonly found in phishing URLs
SUSPICIOUS_KEYWORDS = [
    "login",
    "verify",
    "update",
    "secure",
    "account",
    "banking",
    "confirm",
    "password",
    "support",
    "service",
    "auth",
    "recover",
    "wallet",
    "validate"
]

# Suspicious Top-Level Domains (TLDs) frequently abused
SUSPICIOUS_TLDS = [
    ".xyz",
    ".top",
    ".gq",
    ".ml",
    ".cf",
    ".tk",
    ".ga",
    ".pw",
    ".cc",
    ".surf",
    ".icu",
    ".wang"
]

# Known URL shorteners
URL_SHORTENERS = [
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "is.gd",
    "buff.ly",
    "ow.ly",
    "cutt.ly"
]
