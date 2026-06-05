import logging
import requests
from typing import List, Dict, Any
from .provider_base import ThreatFeedProvider

logger = logging.getLogger(__name__)

class OpenPhishProvider(ThreatFeedProvider):
    """
    Fetches the free community OpenPhish feed.
    Source: https://openphish.com/feed.txt
    """
    
    FEED_URL = "https://openphish.com/feed.txt"
    SOURCE_NAME = "OpenPhish"
    
    def fetch_intelligence(self) -> List[Dict[str, Any]]:
        results = []
        try:
            # Short timeout to fail safely if the feed is unresponsive
            response = requests.get(self.FEED_URL, timeout=10)
            response.raise_for_status()
            
            lines = response.text.strip().split("\n")
            for line in lines:
                url = line.strip()
                if not url:
                    continue
                    
                results.append({
                    "url": url,
                    "source": self.SOURCE_NAME,
                    "confidence": "High",
                    "category": "Generic Phishing"
                })
                
            logger.info(f"OpenPhishProvider: Successfully fetched {len(results)} indicators.")
        except requests.RequestException as e:
            logger.warning(f"OpenPhishProvider: Failed to fetch feed data - {e}")
            
        return results
