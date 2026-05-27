def generate_txt_report(scan: dict) -> str:
    """
    Generate a highly readable plain-text report with structured sections.
    """
    status_str = scan.get("status", "unknown").upper()
    reasons = scan.get("reasons", [])
    tech = scan.get("technical_details", {})
    if isinstance(tech, str):
        import json
        try:
            tech = json.loads(tech)
        except Exception:
            tech = {}
            
    report = []
    report.append("=" * 70)
    report.append("                    PHISHGUARD SECURITY PLATFORM")
    report.append("                       DETAILED THREAT REPORT")
    report.append("=" * 70)
    report.append(f"Scan ID     : {scan.get('id')}")
    report.append(f"Scanned URL : {scan.get('url')}")
    report.append(f"Timestamp   : {scan.get('created_at')}")
    report.append(f"Scan Type   : {scan.get('scan_type', 'rule-based')}")
    report.append("=" * 70)
    report.append("")
    
    # 1. SUMMARY
    report.append("----------------------------------------------------------------------")
    report.append("1. SUMMARY")
    report.append("----------------------------------------------------------------------")
    report.append(f"Threat Score   : {scan.get('score', 0)}/100")
    report.append(f"Severity Status: {status_str}")
    report.append(f"Severity Tier  : {tech.get('severity_tier', 'N/A')}")
    report.append(f"Threat Category: {tech.get('threat_category', 'N/A')}")
    if tech.get("consensus_level"):
        report.append(f"Consensus Level: {tech.get('consensus_level')}")
    
    if tech.get("confidence") is not None:
        report.append(f"Confidence     : {float(tech.get('confidence')) * 100:.1f}%")
    
    status_desc = ""
    if status_str == "SAFE":
        status_desc = "No phishing indicators detected. The URL appears safe to visit."
    elif status_str == "SUSPICIOUS":
        status_desc = "Potential phishing or security risks detected. Exercise extreme caution."
    else:
        status_desc = "High-risk phishing indicators detected. Avoid visiting or submitting data."
        
    report.append(f"Assessment     : {status_desc}")
    report.append("")
    
    # WHY THIS MATTERS (EDUCATIONAL INSIGHT)
    if tech.get("educational_insight"):
        report.append("----------------------------------------------------------------------")
        report.append("WHY THIS MATTERS")
        report.append("----------------------------------------------------------------------")
        report.append(tech.get("educational_insight"))
        report.append("")

    # SCAN JOURNEY TIMELINE
    journey = tech.get("scan_journey")
    if journey:
        report.append("----------------------------------------------------------------------")
        report.append("SCAN JOURNEY TIMELINE")
        report.append("----------------------------------------------------------------------")
        for stage in journey:
            status_symbol = "[✓] PASSED"
            if stage.get("status") == "triggered":
                status_symbol = "[!] TRIGGERED"
            elif stage.get("status") == "warning":
                status_symbol = "[w] WARNING"
            elif stage.get("status") == "critical":
                status_symbol = "[x] CRITICAL"
            elif stage.get("status") == "informational":
                status_symbol = "[i] INFO"
            
            report.append(f"  {status_symbol:<13} • {stage.get('stage')}")
            report.append(f"                Details: {stage.get('message')}")
            report.append("")

    
    # 2. FINDINGS
    report.append("----------------------------------------------------------------------")
    report.append("2. FINDINGS")
    report.append("----------------------------------------------------------------------")
    if reasons:
        report.append("The following threat factors or anomalies were detected during the audit:")
        for idx, reason in enumerate(reasons, 1):
            report.append(f"  [{idx}] {reason}")
    else:
        report.append("  [✓] No suspicious patterns or rule violations identified.")
    report.append("")
    
    # 3. TECHNICAL DETAILS
    report.append("----------------------------------------------------------------------")
    report.append("3. TECHNICAL DETAILS")
    report.append("----------------------------------------------------------------------")
    report.append(f"  • Target Domain          : {tech.get('domain', 'N/A')}")
    report.append(f"  • HTTPS Status           : {'Secured (HTTPS)' if tech.get('https') else 'Missing (HTTP - Insecure)'}")
    report.append(f"  • URL Character Length   : {tech.get('url_length', 0)}")
    report.append(f"  • Subdomain Count        : {tech.get('subdomain_count', 0)}")
    report.append(f"  • IP Address in Hostname : {'Yes (Suspicious)' if tech.get('contains_ip') else 'No'}")
    report.append(f"  • Suspicious TLD Class   : {'Yes (High-risk TLD)' if tech.get('suspicious_tld') else 'No'}")
    
    keywords = tech.get('suspicious_keywords_found', [])
    if keywords:
        report.append(f"  • Suspicious Keywords    : {', '.join(keywords)}")
    else:
        report.append("  • Suspicious Keywords    : None")
        
    report.append(f"  • Redirect Pattern Check : {'Flagged' if tech.get('redirect_pattern_detected') else 'Clean'}")
    
    if tech.get("path_depth") is not None:
        report.append(f"  • Path Segment Depth    : {tech.get('path_depth')}")
    if tech.get("query_parameter_count") is not None:
        report.append(f"  • Query Parameter Count : {tech.get('query_parameter_count')}")
    if tech.get("entropy_score") is not None:
        report.append(f"  • URL Entropy Score     : {float(tech.get('entropy_score')):.3f}")
        
    report.append("")
    
    # 4. RECOMMENDATION
    report.append("----------------------------------------------------------------------")
    report.append("4. RECOMMENDATION")
    report.append("----------------------------------------------------------------------")
    report.append(scan.get("recommendation", "No specific recommendation generated for this scan."))
    report.append("")
    
    report.append("=" * 70)
    report.append("       Report generated by PhishGuard Threat Intelligence Engine")
    report.append("=" * 70)
    
    return "\n".join(report)
