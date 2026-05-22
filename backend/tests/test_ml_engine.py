import os
import sys

# Ensure backend/app is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.services.model_engine import feature_extractor, model_loader, predictor

def test_extraction():
    print("Testing Feature Extraction...")
    url = "https://login.paypal.com.verify-identity.xyz/login.php?user=test"
    feats = feature_extractor.extract_features(url)
    vector = feature_extractor.get_features_vector(url)
    
    print(f"Extracted {len(feats)} features:")
    for k, v in feats.items():
        print(f"  {k}: {v}")
        
    assert len(feats) == 15
    assert len(vector) == 15
    assert feats["https"] == 1
    assert feats["suspicious_keyword_count"] >= 1
    print("Feature Extraction Test Passed!\n")

def test_prediction():
    print("Testing Predictor...")
    # Safe URL
    url_safe = "https://www.google.com/search?q=machine+learning"
    status, score, confidence, feats, reasons, recommendation = predictor.predict_url(url_safe)
    print(f"Safe URL Test: {url_safe}")
    print(f"  Status        : {status}")
    print(f"  Score         : {score}")
    print(f"  Confidence    : {confidence:.2f}")
    print(f"  Reasons       : {reasons}")
    print(f"  Recommendation: {recommendation}")
    assert status == "SAFE"
    
    # Phishing URL
    url_phish = "http://paypal-login-verify-account.top/update.php?id=987"
    status, score, confidence, feats, reasons, recommendation = predictor.predict_url(url_phish)
    print(f"\nPhishing URL Test: {url_phish}")
    print(f"  Status        : {status}")
    print(f"  Score         : {score}")
    print(f"  Confidence    : {confidence:.2f}")
    print(f"  Reasons       : {reasons}")
    print(f"  Recommendation: {recommendation}")
    assert status == "DANGEROUS" or status == "SUSPICIOUS"
    
    print("\nPredictor Test Passed!")

def main():
    print("========================================")
    print("RUNNING PHISHGUARD ML UNIT TESTS")
    print("========================================")
    
    # Load model once to cache it
    print("Pre-loading model...")
    model_loader.load_model_and_metadata()
    
    test_extraction()
    test_prediction()
    
    print("\nALL ML UNIT TESTS PASSED SUCCESSFULLY!")
    print("========================================")

if __name__ == "__main__":
    main()
