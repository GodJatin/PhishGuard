import json

def generate_json_report(scan: dict) -> str:
    """
    Generate a formatted, pretty JSON report from the scan data.
    """
    return json.dumps(scan, indent=2, ensure_ascii=False, default=str)
