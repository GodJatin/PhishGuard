import logging
import requests
import csv
from io import StringIO
from typing import List, Dict, Any
from .provider_base import ThreatFeedProvider

logger = logging.getLogger(__name__)

class URLHausProvider(ThreatFeedProvider):
    """
    Fetches the URLHaus feed.
    Source: https://urlhaus.abuse.ch/downloads/csv_online/
    """
    
    FEED_URL = "https://urlhaus.abuse.ch/downloads/csv_online/"
    SOURCE_NAME = "URLHaus"
    
    def fetch_intelligence(self) -> List[Dict[str, Any]]:
        results = []
        try:
            response = requests.get(self.FEED_URL, timeout=15)
            response.raise_for_status()
            
            # URLHaus returns a CSV where lines starting with '#' are comments.
            # Col 2 (index 2 in list of 9) is URL, Col 3 is status (online), Col 4 is threat.
            csv_data = [line for line in response.text.split("\n") if not line.startswith("#") and line.strip()]
            reader = csv.reader(csv_data)
            
            for row in reader:
                if len(row) > 4:
                    url = row[2].strip()
                    threat_type = row[4].strip()
                    
                    if not url:
                        continue
                        
                    results.append({
                        "url": url,
                        "source": self.SOURCE_NAME,
                        "confidence": "High",
                        "category": f"Malware Delivery ({threat_type})" if threat_type else "Malware Delivery"
                    })
                    
            logger.info(f"URLHausProvider: Successfully fetched {len(results)} indicators.")
        except requests.RequestException as e:
            logger.warning(f"URLHausProvider: Failed to fetch feed data - {e}")
            
        return results
