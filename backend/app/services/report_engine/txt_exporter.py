def generate_txt_report(scan: dict) -> str:
    """
    Generate a highly readable plain-text report with structured sections.
    """
    status_str = scan.get("status", "unknown").upper()
    tech = scan.get("technical_details", {})
    if isinstance(tech, str):
        import json
        try:
            tech = json.loads(tech)
        except Exception:
            tech = {}
            
    meta = scan.get("scan_metadata", {})
    if isinstance(meta, str):
        import json
        try:
            meta = json.loads(meta)
        except Exception:
            meta = {}
            
    report = []
    report.append("=" * 70)
    report.append("                    PHISHGUARD SECURITY PLATFORM")
    report.append("                       DETAILED THREAT REPORT")
    report.append("=" * 70)
    
    # Extract snapshot
    decision = meta.get("decision_snapshot", {})
    final_verdict = decision.get("final_verdict", tech.get("severity_tier", status_str))
    root_cause = decision.get("root_cause", "No specific intelligence trigger activated.")
    trigger = decision.get("escalation_trigger", "None")
    confidence = decision.get("confidence", "Unknown")
    consensus = decision.get("consensus", "Unknown")
    pres_finding = tech.get("threat_category", "Generic Phishing Attempt")
    pres_action = scan.get("recommendation", "Exercise normal caution.")
    
    # 0. INVESTIGATION METADATA
    report.append("INVESTIGATION METADATA")
    report.append("-" * 35)
    report.append(f"Scan ID         : {scan.get('id')}")
    report.append(f"Scan Timestamp  : {scan.get('created_at')}")
    report.append(f"Engine Mode     : {scan.get('scan_type', 'rule-based').capitalize()}")
    scan_source = str(scan.get('scan_source', 'manual')).upper()
    source_str = "QR Code" if scan_source == "QR" else "Manual URL"
    report.append(f"Input Source    : {source_str}")
    report.append("Report Version  : PhishGuard Intelligence Report v1.0")
    report.append("")

    # 0.5 SEVERITY BANNER
    report.append("=" * 70)
    report.append(f" THREAT LEVEL: {final_verdict} ")
    report.append(f" Category: {pres_finding} | Confidence: {confidence}")
    report.append("=" * 70)
    report.append("")

    # 1. EXECUTIVE SUMMARY
    report.append("1. EXECUTIVE SUMMARY")
    report.append("-" * 35)
    report.append(f"Threat Level     : {final_verdict}")
    report.append(f"Primary Finding  : {pres_finding}")
    report.append(f"Root Cause       : {root_cause}")
    report.append(f"Escalation Trigger: {trigger}")
    report.append(f"Confidence       : {confidence}")
    report.append(f"Consensus        : {consensus}")
    report.append("")

    # 2. DECISION SNAPSHOT
    report.append("2. DECISION SNAPSHOT")
    report.append("-" * 35)
    report.append(f"Final Verdict    : {final_verdict}")
    report.append(f"Root Cause       : {root_cause}")
    report.append(f"Escalation Trigger: {trigger}")
    report.append(f"Confidence       : {confidence}")
    report.append(f"Consensus        : {consensus}")
    report.append("")

    # 3. SUPPORTING EVIDENCE
    report.append("3. SUPPORTING EVIDENCE")
    report.append("-" * 35)
    evidence = meta.get("supporting_evidence", [])
    if evidence:
        for ev in evidence:
            report.append(f"✓ {ev}")
    else:
        report.append("No supporting evidence explicitly stored.")
    report.append("")
    
    # 4. THREAT INTELLIGENCE ANALYSIS
    report.append("4. THREAT INTELLIGENCE ANALYSIS")
    report.append("-" * 35)
    tf = meta.get("threat_feeds", {})
    matched = tf.get("matched_sources", []) if tf else []
    report.append(f"OpenPhish: {'MATCH' if 'OpenPhish' in matched else 'No Match'}")
    report.append(f"PhishTank: {'MATCH' if 'PhishTank' in matched else 'No Match'}")
    report.append(f"URLHaus  : {'MATCH' if 'URLHaus' in matched else 'No Match'}")
    report.append("")
    
    # 5. DOMAIN INTELLIGENCE ANALYSIS
    report.append("5. DOMAIN INTELLIGENCE ANALYSIS")
    report.append("-" * 35)
    domain_intel = meta.get("domain_intelligence", {})
    di_status = domain_intel.get("status", "success")
    if di_status == "unregistered":
        report.append("Registrar   : Unknown")
        report.append("Created Date: Not Registered")
        report.append("Domain Age  : N/A")
        report.append("Risk Signal : High")
        report.append("Status      : Unregistered Domain Detected")
        report.append("Interpretation: Domain registration information could not be verified through RDAP/WHOIS sources. This does not confirm malicious activity, but limits confidence in registration-age assessment.")
    elif di_status == "failed":
        report.append("Registrar   : Unavailable")
        report.append("Created Date: Lookup Failed")
        report.append("Domain Age  : Unknown")
        report.append("Risk Signal : Unknown")
        report.append("Status      : Lookup Failure")
        report.append("Interpretation: Domain registration information could not be verified through RDAP/WHOIS sources. This does not confirm malicious activity, but limits confidence in registration-age assessment.")
    else:
        age = domain_intel.get('domain_age_days')
        risk_signal = "Low"
        interpretation_text = ""
        if age is not None:
            if age <= 30:
                risk_signal = "High"
                interpretation_text = "This domain was registered recently. Threat actors frequently utilize newly registered infrastructure to bypass historic reputation filters."
            elif age <= 90:
                risk_signal = "Medium"
            else:
                interpretation_text = "The domain exhibits a mature registration history, which generally lowers the risk of it being a disposable phishing asset."
        report.append(f"Registrar   : {domain_intel.get('registrar', 'Unknown')}")
        report.append(f"Created Date: {domain_intel.get('created_date', 'Unknown')}")
        report.append(f"Domain Age  : {age if age is not None else 'Unknown'} Days")
        report.append(f"Risk Signal : {risk_signal}")
        report.append("Status      : Known Domain")
        if interpretation_text:
            report.append(f"Interpretation: {interpretation_text}")
    report.append("")

    # 6. BRAND SPOOF ANALYSIS
    report.append("6. BRAND SPOOF ANALYSIS")
    report.append("-" * 35)
    spoofed = tech.get("brand_spoof_detected", False)
    if spoofed:
        report.append(f"Impersonated Brand: {tech.get('suspected_brand', 'Unknown')}")
        report.append(f"Spoof Type        : {tech.get('spoof_type', 'Unknown')}")
        report.append("Detection Method  : Trademark Similarity Analysis")
        report.append("Risk Assessment   : High")
        report.append(f"Reason            : {tech.get('spoof_explanation', 'Potential impersonation detected.')}")
    else:
        report.append("Status            : No Brand Impersonation Detected")
        report.append("Detection Method  : Trademark Similarity Analysis")
        report.append("Risk Assessment   : Low")
    report.append("")

    # 7. INVESTIGATION TIMELINE
    report.append("7. INVESTIGATION TIMELINE")
    report.append("-" * 35)
    journey = tech.get("scan_journey", [])
    if journey:
        for step in journey:
            st = step.get("status", "informational")
            st_text = st.capitalize()
            if st == "passed": icon = "✓"
            elif st == "triggered" or st == "escalated": icon = "⚠"
            else: icon = "ℹ"
            report.append(f"{step.get('stage', 'Analysis Step')}")
            report.append(f"{icon} {st_text} - {step.get('message', '')}")
            report.append("")
    else:
        report.append("Timeline data not available.")
        report.append("")
        
    # 8. TECHNICAL NOTES
    report.append("8. TECHNICAL NOTES")
    report.append("-" * 35)
    tech_notes_lines = meta.get("technical_notes", "No additional engine analysis available.").split(". ")
    for line in tech_notes_lines:
        line = line.strip()
        if line:
            if not line.endswith("."): line += "."
            report.append(line)
    report.append("")
    
    # 9. RECOMMENDATIONS
    report.append("9. RECOMMENDATIONS")
    report.append("-" * 35)
    recommendation_lines = scan.get("recommendation", "Exercise caution when interacting with this domain.").split(". ")
    for line in recommendation_lines:
        line = line.strip()
        if line:
            if not line.endswith("."): line += "."
            report.append(line)
    report.append("")

    # 10. EXECUTIVE CONCLUSION
    report.append("10. EXECUTIVE CONCLUSION")
    report.append("-" * 35)
    report.append(f"PhishGuard classified this domain as {final_verdict}.")
    
    target_str = ""
    if spoofed and tech.get('suspected_brand'):
        target_str = f" targeting {tech.get('suspected_brand')}."
    elif pres_finding != "Generic Phishing Attempt":
        target_str = "."
    report.append(f"The domain exhibits characteristics consistent with {pres_finding}{target_str}")
    
    tf_matched = bool(matched)
    if tf_matched:
        report.append("Threat intelligence feed matches were identified, verifying the domain's status as a known malicious indicator.")
    else:
        report.append("No threat intelligence feed matches were identified at the time of analysis. However, brand spoof indicators and heuristic analysis provided sufficient evidence to classify the domain as a likely phishing candidate.")
        
    report.append(pres_action.split(". ")[0] + ("." if not pres_action.split(". ")[0].endswith(".") else ""))
    report.append("")

    # 11. EVIDENCE SNAPSHOT
    report.append("11. EVIDENCE SNAPSHOT")
    report.append("-" * 35)
    evidence_snapshot = meta.get("evidence_snapshot", {})
    if evidence_snapshot:
        for k, v in evidence_snapshot.items():
            report.append(f"{k.replace('_', ' ').title().ljust(20)}: {v}")
    else:
        # Generate from stored intelligence but use strict fallback for missing numeric scores
        report.append(f"{'Brand Spoof'.ljust(20)}: {'Detected' if spoofed else 'No Match'}")
        report.append(f"{'Threat Feed'.ljust(20)}: {'Match Found' if tf_matched else 'No Match'}")
        report.append(f"{'Domain Status'.ljust(20)}: {di_status.capitalize()}")
        report.append(f"{'Threat Category'.ljust(20)}: {pres_finding}")
        
        rule_score = tech.get("combined_score", "Not Available in Historical Record")
        ml_score = tech.get("ml_confidence", "Not Available in Historical Record")
        report.append(f"{'Rule Engine Score'.ljust(20)}: {rule_score}")
        report.append(f"{'ML Engine Score'.ljust(20)}: {ml_score}")
    report.append("")

    # Phase 6.5 Threat Feed Appendix
    try:
        cache_count = int(tf.get("cache_count", 0) if tf.get("cache_count") is not None else 0)
    except ValueError:
        cache_count = 0

    if isinstance(tf, dict) and cache_count > 0:
        report.append("Appendix: Threat Intelligence Health Diagnostics")
        report.append(f"Feed Entries Available: {cache_count} | Last Sync Timestamp: {tf.get('last_sync', 'Unknown')}")
        report.append("")
        
    report.append("=" * 70)
    report.append("       Report generated by PhishGuard Threat Intelligence Engine")
    report.append("=" * 70)
    
    return "\n".join(report)
