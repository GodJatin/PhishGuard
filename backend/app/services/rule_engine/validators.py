import urllib.parse

def validate_and_normalize_url(url: str) -> str:
    """
    Validates and normalizes the input URL.
    Returns the normalized URL if valid, or raises ValueError if malformed.
    """
    url = url.strip()
    
    if not url:
        raise ValueError("URL cannot be empty.")

    # Automatically prepend http if no scheme is provided to allow parsing, 
    # though technically a valid URL should have a scheme.
    if not url.startswith(('http://', 'https://', 'ftp://')):
        url = 'http://' + url

    try:
        parsed = urllib.parse.urlparse(url)
        if not parsed.netloc:
            raise ValueError("Malformed URL: Missing domain.")
        
        # Prevent completely arbitrary schemes (e.g. javascript:, file:)
        if parsed.scheme not in ['http', 'https']:
            raise ValueError("Unsupported URL scheme. Only HTTP and HTTPS are allowed.")
            
        # Re-construct normalized URL
        normalized = urllib.parse.urlunparse(parsed)
        return normalized
    except Exception as e:
        raise ValueError(f"Invalid URL structure: {str(e)}")
