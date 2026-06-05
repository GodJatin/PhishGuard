import logging
import requests
import csv
from typing import List, Dict, Any
from .provider_base import ThreatFeedProvider

logger = logging.getLogger(__name__)

class PhishTankProvider(ThreatFeedProvider):
    """
    Fetches the PhishTank feed.
    Source: http://data.phishtank.com/data/online-valid.csv
    Note: PhishTank requires an Application Key for frequent downloads, 
    otherwise it rate limits. This gracefully handles failures.
    """
    
    FEED_URL = "http://data.phishtank.com/data/online-valid.csv"
    SOURCE_NAME = "PhishTank"
    
    def fetch_intelligence(self) -> List[Dict[str, Any]]:
        results = []
        try:
            response = requests.get(self.FEED_URL, timeout=15)
            response.raise_for_status()
            
            lines = [line for line in response.text.split("\n") if line.strip()]
            if not lines:
                return results
                
            reader = csv.DictReader(lines)
            for row in reader:
                url = row.get("url", "").strip()
                if not url:
                    continue
                    
                results.append({
                    "url": url,
                    "source": self.SOURCE_NAME,
                    "confidence": "High",
                    "category": "Credential Theft"
                })
                
            logger.info(f"PhishTankProvider: Successfully fetched {len(results)} indicators.")
        except requests.RequestException as e:
            logger.warning(f"PhishTankProvider: Failed to fetch feed data (likely rate-limited) - {e}")
            
        return results
