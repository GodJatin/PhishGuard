import datetime
from typing import List, Dict, Any

def calculate_trends(scans: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Computes daily scan status counts for the last 7 days, zero-filled for missing dates.
    Returns chronologically sorted results.
    """
    today = datetime.date.today()
    # Generate last 7 days (earliest first)
    date_list = [today - datetime.timedelta(days=i) for i in range(6, -1, -1)]
    
    daily_data = {}
    for d in date_list:
        date_str = d.isoformat()
        daily_data[date_str] = {
            "date": date_str,
            "total": 0,
            "safe": 0,
            "suspicious": 0,
            "dangerous": 0
        }
        
    for scan in scans:
        created_at_str = scan.get("created_at")
        if not created_at_str:
            continue
            
        try:
            # Normalize trailing 'Z' if present
            if created_at_str.endswith("Z"):
                created_at_str = created_at_str[:-1] + "+00:00"
            dt = datetime.datetime.fromisoformat(created_at_str)
            dt_date_str = dt.date().isoformat()
            
            if dt_date_str in daily_data:
                status = (scan.get("status") or "").lower().strip()
                daily_data[dt_date_str]["total"] += 1
                if status == "safe":
                    daily_data[dt_date_str]["safe"] += 1
                elif status == "suspicious":
                    daily_data[dt_date_str]["suspicious"] += 1
                elif status == "dangerous":
                    daily_data[dt_date_str]["dangerous"] += 1
        except Exception:
            continue
            
    return [daily_data[d.isoformat()] for d in date_list]
