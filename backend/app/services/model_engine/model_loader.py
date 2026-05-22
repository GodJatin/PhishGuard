import os
import pickle
import json
import logging
from typing import Optional, Tuple, Any

logger = logging.getLogger(__name__)

# Singletons cached in memory
_model: Any = None
_metadata: Optional[dict] = None

class SecurityError(Exception):
    pass

def get_model_path() -> str:
    """
    Returns the absolute path to the phishing model file.
    """
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    return os.path.abspath(os.path.join(base_dir, "ml_models", "phishing_model.pkl"))

def get_metadata_path() -> str:
    """
    Returns the absolute path to the metadata JSON file.
    """
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    return os.path.abspath(os.path.join(base_dir, "ml_models", "model_metadata.json"))

def load_model_and_metadata(force_reload: bool = False) -> Tuple[Any, Optional[dict]]:
    """
    Loads the trained model and its metadata JSON.
    Loads once and caches in memory.
    Enforces strict path validation and handles corrupt pickle / version incompatibilities.
    """
    global _model, _metadata
    
    if _model is not None and not force_reload:
        return _model, _metadata
        
    model_path = get_model_path()
    metadata_path = get_metadata_path()
    
    # 1. STRICT SECURITY PATH VALIDATION
    norm_path = os.path.normpath(model_path)
    # Check that it ends with exactly: ml_models/phishing_model.pkl
    expected_suffix = os.path.join("ml_models", "phishing_model.pkl")
    if not norm_path.endswith(expected_suffix):
        logger.error(f"Strict path validation failed: Attempted to load from path: {model_path}")
        raise SecurityError("Model load aborted: Unauthorized model path. Only backend/ml_models/phishing_model.pkl is allowed.")

    # 2. Check existence
    if not os.path.exists(model_path):
        logger.error(f"Model file not found at path: {model_path}")
        raise FileNotFoundError(f"Phishing model file is missing at expected path: {model_path}")

    # 3. Load Metadata (JSON)
    _metadata = None
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r") as f:
                _metadata = json.load(f)
            logger.info(f"Model metadata loaded successfully from: {metadata_path}")
        except Exception as e:
            logger.error(f"Error reading model metadata: {e}")
            # Non-fatal, metadata failure shouldn't crash the entire loader
            
    # 4. Load Model pickle (handle corrupt pickle and version mismatch)
    try:
        with open(model_path, "rb") as f:
            _model = pickle.load(f)
        logger.info(f"Model loaded and cached successfully from: {model_path}")
    except ModuleNotFoundError as mne:
        logger.error(f"Incompatible sklearn version or missing package during unpickling: {mne}")
        raise RuntimeError("Incompatible scikit-learn version or dependencies.") from mne
    except (pickle.UnpicklingError, AttributeError, EOFError) as pe:
        logger.error(f"Corrupt or invalid model file: {pe}")
        raise ValueError("Corrupt model file. Unpickling failed.") from pe
    except Exception as e:
        logger.exception(f"Unexpected error loading model: {e}")
        raise RuntimeError(f"Failed to load the model: {e}") from e

    return _model, _metadata
