import urllib.parse

# Maximum URL length accepted for analysis (matches schema constraint)
_MAX_URL_LENGTH = 2048

def validate_and_normalize_url(url: str) -> str:
    """
    Validates and normalizes the input URL.
    Returns the normalized URL if valid, or raises ValueError if malformed.
    """
    if not url or not url.strip():
        raise ValueError("URL cannot be empty.")

    url = url.strip()

    # Hard length cap — prevents DoS via huge URL strings
    if len(url) > _MAX_URL_LENGTH:
        raise ValueError(f"URL exceeds maximum allowed length of {_MAX_URL_LENGTH} characters.")

    # Reject clearly dangerous schemes before any parsing
    lower_url = url.lower()
    dangerous_prefixes = ("javascript:", "data:", "vbscript:", "file:", "about:", "blob:")
    for prefix in dangerous_prefixes:
        if lower_url.startswith(prefix):
            raise ValueError("Unsupported URL scheme. Only HTTP and HTTPS URLs are accepted.")

    # Automatically prepend http:// if no scheme is provided
    if not url.startswith(('http://', 'https://', 'ftp://')):
        url = 'http://' + url

    try:
        parsed = urllib.parse.urlparse(url)

        if not parsed.netloc:
            raise ValueError("Malformed URL: No domain found.")

        # Strip port for domain validation
        host = parsed.hostname or ""

        # Must have at least one dot (or be an IP), reject bare names like 'localhost'
        # Allow IP addresses through — they are checked by the rule engine
        import ipaddress
        is_ip = False
        try:
            ipaddress.ip_address(host)
            is_ip = True
        except ValueError:
            pass

        if not is_ip and '.' not in host:
            raise ValueError("Malformed URL: Domain must contain at least one dot (e.g., example.com).")

        # Only allow http and https schemes
        if parsed.scheme not in ('http', 'https'):
            raise ValueError("Unsupported URL scheme. Only HTTP and HTTPS are allowed.")

        # Reconstruct normalized URL
        normalized = urllib.parse.urlunparse(parsed)
        return normalized

    except ValueError:
        raise  # Re-raise our own ValueErrors directly
    except Exception:
        raise ValueError("Invalid URL structure. Please check the URL and try again.")

