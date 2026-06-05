from abc import ABC, abstractmethod
from typing import List, Dict, Any

class ThreatFeedProvider(ABC):
    """
    Abstract base class for all external threat intelligence feed providers.
    Ensures that any new threat feed integrates perfectly into the engine.
    """

    @abstractmethod
    def fetch_intelligence(self) -> List[Dict[str, Any]]:
        """
        Fetches intelligence from the external feed source and normalizes it.
        
        Must return a list of dictionaries with the exact structure:
        {
            "url": str,                 # The raw malicious URL/domain
            "source": str,              # Identifier e.g., "OpenPhish"
            "confidence": str,          # E.g., "High", "Medium", "Low"
            "category": str             # E.g., "Credential Theft", "Malware", "Phishing"
        }
        """
        pass
