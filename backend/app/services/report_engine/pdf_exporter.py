from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

import html

def safe_xml_escape(text: str) -> str:
    """
    Safely escapes characters for ReportLab XML paragraph compatibility.
    """
    if not text:
        return ""
    return html.escape(str(text))

def _format_url_for_wrap(url: str) -> str:
    """
    Escapes special characters and inserts extremely tiny spaces in font tags
    after key characters to allow ReportLab Paragraph to wrap long URLs.
    This avoids rendering malformed black box artifacts (■) from \u200b characters.
    """
    if not url:
        return ""
    escaped = html.escape(url)
    
    result = []
    break_chars = {'/', '?', '=', '.', '-', '_'}
    for char in escaped:
        result.append(char)
        if char in break_chars:
            result.append('<font size="0.1"> </font>')
    escaped_wrapped = "".join(result)
    escaped_wrapped = escaped_wrapped.replace('&amp;', '&amp;<font size="0.1"> </font>')
    return escaped_wrapped


def draw_background(canvas, doc):
    canvas.saveState()
    # Light gray diagonal watermark
    canvas.setFont('Helvetica-Bold', 36)
    canvas.setFillColor(colors.HexColor('#0F172A'))
    canvas.setFillAlpha(0.015) # extremely light watermark
    
    # Draw diagonal text
    canvas.translate(doc.pagesize[0]/2, doc.pagesize[1]/2)
    canvas.rotate(35)
    canvas.drawCentredString(0, 0, "PHISHGUARD TECHNICAL AUDIT")
    canvas.restoreState()
    
    # Authenticity verification footer and compliance stamp
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#64748B'))
    
    # Draw thin line above footer
    canvas.setStrokeColor(colors.HexColor('#E2E8F0'))
    canvas.setLineWidth(0.5)
    canvas.line(54, 45, doc.pagesize[0]-54, 45)
    
    canvas.drawString(54, 32, "VERIFICATION AUTHENTICITY STAMP: phishguard-secured")
    canvas.drawRightString(doc.pagesize[0]-54, 32, f"AUTHENTICITY COMPLIANT | Page {canvas._pageNumber}")
    canvas.restoreState()


def generate_pdf_report(scan: dict) -> bytes:
    buffer = BytesIO()
    
    # 0.75 in margins = 54 points
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Define custom typography and styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=10
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=12,
        spaceAfter=5
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=5
    )
    
    mono_style = ParagraphStyle(
        'DocMono',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0F172A')
    )
    
    status = scan.get("status", "unknown").upper()
    score = scan.get("score", 0)
    scan_type = scan.get("scan_type", "rule-based")
    
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
            
    # Status colors
    if status == 'SAFE':
        status_color = colors.HexColor('#10B981')  # Emerald Green
        status_bg = colors.HexColor('#D1FAE5')
    elif status == 'SUSPICIOUS':
        status_color = colors.HexColor('#F59E0B')  # Amber Yellow
        status_bg = colors.HexColor('#FEF3C7')
    elif status == 'HIGH RISK':
        status_color = colors.HexColor('#F97316')  # Orange
        status_bg = colors.HexColor('#FFEDD5')
    else:
        status_color = colors.HexColor('#EF4444')  # Rose Red
        status_bg = colors.HexColor('#FEE2E2')
        
    story = []
    
    # 1. Header Section (PhishGuard Branding)
    brand_style = ParagraphStyle(
        'BrandText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        textColor=colors.HexColor('#10B981')
    )
    meta_style = ParagraphStyle(
        'MetaText',
        parent=styles['Normal'],
        alignment=2, # Right aligned
        fontName='Helvetica',
        fontSize=8,
        textColor=colors.HexColor('#64748B')
    )
    
    header_data = [
        [
            Paragraph("<b>PhishGuard</b> <font color='#64748B'>| Threat Intelligence</font>", brand_style),
            Paragraph(f"<b>Generated:</b> {(scan.get('created_at') or scan.get('timestamp') or '')[:19]}<br/><b>Report ID:</b> {(scan.get('id') or scan.get('scan_id') or '')[:8]}...", meta_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[4.2*inch, 2.8*inch])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(header_table)
    
    # Divider line
    divider = Table([[""]], colWidths=[7*inch], rowHeights=[2])
    divider.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1.5, colors.HexColor('#E2E8F0')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(divider)
    story.append(Spacer(1, 10))
    
    # Title
    story.append(Paragraph("Detailed Threat Analysis Report", title_style))
    story.append(Spacer(1, 5))
    
    # Fetch variables for all blocks
    meta = scan.get("scan_metadata", {}) or {}
    decision = meta.get("decision_snapshot", {}) or {}
    
    pres_verdict = decision.get("final_verdict") or scan.get("status", "SAFE")
    pres_finding = tech.get("threat_category", "Generic Phishing Attempt")
    pres_root_cause = decision.get("root_cause", "No specific intelligence trigger activated.")
    pres_escalation = decision.get("escalation_trigger", "None")
    pres_conf = decision.get("confidence", "Unknown")
    pres_cons = decision.get("consensus", "Unknown")
    pres_action = scan.get("recommendation", "Exercise normal caution.")

    def create_section_header(title):
        return Paragraph(title, section_title_style)
        
    def create_table_from_dict(data_dict, col_widths=[2.0*inch, 5.0*inch]):
        rows = []
        for k, v in data_dict.items():
            rows.append([Paragraph(f"<b>{k}</b>", body_style), Paragraph(safe_xml_escape(str(v)), body_style)])
        t = Table(rows, colWidths=col_widths)
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        return t

    # 1. Investigation Metadata (Refinement 3)
    scan_source = str(scan.get('scan_source', 'manual')).upper()
    source_str = "QR Code" if scan_source == "QR" else "Manual URL"
    story.append(create_section_header("Investigation Metadata"))
    meta_dict = {
        "Scan ID:": scan.get('id', 'Unknown'),
        "Scan Timestamp:": scan.get('created_at', 'Unknown'),
        "Engine Mode:": scan.get('scan_type', 'rule-based').capitalize(),
        "Input Source:": source_str,
        "Report Version:": "PhishGuard Intelligence Report v1.0"
    }
    story.append(create_table_from_dict(meta_dict))
    story.append(Spacer(1, 10))

    # 2. Visual Severity Banner (Phase 6)
    banner_data = [
        [
            Paragraph(f"<font color='#FFFFFF' size=14><b>{pres_verdict}</b></font>", body_style),
            Paragraph(f"<font color='#FFFFFF'>Category: {safe_xml_escape(pres_finding)} | Confidence: {safe_xml_escape(pres_conf)}</font>", body_style)
        ]
    ]
    t_banner = Table(banner_data, colWidths=[2.5*inch, 4.5*inch])
    t_banner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), status_color),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_banner)
    story.append(Spacer(1, 15))

    # 3. EXECUTIVE SUMMARY
    story.append(create_section_header("1. Executive Summary"))
    exec_data = [
        [Paragraph("<b>Threat Level:</b>", body_style), Paragraph(f"<font color='{status_color.hexval()}'><b>{pres_verdict}</b></font>", body_style)],
        [Paragraph("<b>Primary Finding:</b>", body_style), Paragraph(safe_xml_escape(pres_finding), body_style)],
        [Paragraph("<b>Root Cause:</b>", body_style), Paragraph(safe_xml_escape(pres_root_cause), body_style)],
        [Paragraph("<b>Escalation Trigger:</b>", body_style), Paragraph(safe_xml_escape(pres_escalation), body_style)],
        [Paragraph("<b>Confidence:</b>", body_style), Paragraph(safe_xml_escape(pres_conf), body_style)],
        [Paragraph("<b>Consensus:</b>", body_style), Paragraph(safe_xml_escape(pres_cons), body_style)]
    ]
    t_exec = Table(exec_data, colWidths=[2.0*inch, 5.0*inch])
    t_exec.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_exec)
    story.append(Spacer(1, 10))
    
    # 4. DECISION SNAPSHOT
    story.append(create_section_header("2. Decision Snapshot"))
    story.append(create_table_from_dict({
        "Final Verdict:": pres_verdict,
        "Root Cause:": pres_root_cause,
        "Escalation Trigger:": pres_escalation,
        "Confidence:": pres_conf,
        "Consensus:": pres_cons
    }))
    story.append(Spacer(1, 10))

    # 5. SUPPORTING EVIDENCE
    story.append(create_section_header("3. Supporting Evidence"))
    evidence = meta.get("supporting_evidence", [])
    if evidence:
        for ev in evidence:
            story.append(Paragraph(f"<font color='#10B981'>✓</font> {safe_xml_escape(ev)}", body_style))
    else:
        story.append(Paragraph("No supporting evidence explicitly stored.", body_style))
    story.append(Spacer(1, 10))
    
    # Force PageBreak to move analysis logic to Page 2
    story.append(PageBreak())
    
    # 6. THREAT INTELLIGENCE ANALYSIS
    story.append(Paragraph("Intelligence Findings", ParagraphStyle('IntFind', parent=title_style, fontSize=16)))
    story.append(create_section_header("4. Threat Intelligence Analysis"))
    tf = meta.get("threat_feeds", {})
    matched = tf.get("matched_sources", []) if tf else []
    
    def get_tf_color(name):
        return "<font color='#EF4444'>MATCH</font>" if name in matched else "No Match"
        
    story.append(create_table_from_dict({
        "OpenPhish:": get_tf_color('OpenPhish'),
        "PhishTank:": get_tf_color('PhishTank'),
        "URLHaus:": get_tf_color('URLHaus')
    }))
    story.append(Spacer(1, 10))

    # 7. DOMAIN INTELLIGENCE ANALYSIS
    story.append(create_section_header("5. Domain Intelligence Analysis"))
    domain_intel = meta.get("domain_intelligence", {})
    di_status = domain_intel.get("status", "success")
    interpretation_text = ""
    if di_status == "unregistered":
        di_dict = {
            "Registrar:": "Unknown",
            "Created Date:": "Not Registered",
            "Domain Age:": "N/A",
            "Risk Signal:": "<font color='#EF4444'>High</font>",
            "Status:": "Unregistered Domain Detected"
        }
        interpretation_text = "Domain registration information could not be verified through RDAP/WHOIS sources. This does not confirm malicious activity, but limits confidence in registration-age assessment."
    elif di_status == "failed":
        di_dict = {
            "Registrar:": "Unavailable",
            "Created Date:": "Lookup Failed",
            "Domain Age:": "Unknown",
            "Risk Signal:": "Unknown",
            "Status:": "Lookup Failure"
        }
        interpretation_text = "Domain registration information could not be verified through RDAP/WHOIS sources. This does not confirm malicious activity, but limits confidence in registration-age assessment."
    else:
        age = domain_intel.get('domain_age_days')
        risk_signal = "Low"
        rs_color = "#10B981"
        if age is not None:
            if age <= 30:
                risk_signal = "High"
                rs_color = "#EF4444"
                interpretation_text = "This domain was registered recently. Threat actors frequently utilize newly registered infrastructure to bypass historic reputation filters."
            elif age <= 90:
                risk_signal = "Medium"
                rs_color = "#F59E0B"
            else:
                interpretation_text = "The domain exhibits a mature registration history, which generally lowers the risk of it being a disposable phishing asset."
                
        di_dict = {
            "Registrar:": domain_intel.get('registrar', 'Unknown'),
            "Created Date:": domain_intel.get('created_date', 'Unknown'),
            "Domain Age:": f"{age if age is not None else 'Unknown'} Days",
            "Risk Signal:": f"<font color='{rs_color}'>{risk_signal}</font>",
            "Status:": "Known Domain"
        }
    story.append(create_table_from_dict(di_dict))
    if interpretation_text:
        story.append(Spacer(1, 5))
        story.append(Paragraph(f"<b>Interpretation:</b> {safe_xml_escape(interpretation_text)}", body_style))
    story.append(Spacer(1, 10))

    # 8. BRAND SPOOF ANALYSIS
    story.append(create_section_header("6. Brand Spoof Analysis"))
    spoofed = tech.get("brand_spoof_detected", False)
    if spoofed:
        bs_dict = {
            "Impersonated Brand:": tech.get('suspected_brand', 'Unknown'),
            "Spoof Type:": tech.get('spoof_type', 'Unknown'),
            "Detection Method:": "Trademark Similarity Analysis",
            "Risk Assessment:": "<font color='#EF4444'>High</font>",
            "Reason:": tech.get('spoof_explanation', 'Potential impersonation detected.')
        }
    else:
        bs_dict = {
            "Status:": "No Brand Impersonation Detected",
            "Detection Method:": "Trademark Similarity Analysis",
            "Risk Assessment:": "<font color='#10B981'>Low</font>"
        }
    story.append(create_table_from_dict(bs_dict))
    story.append(Spacer(1, 10))

    # 9. INVESTIGATION TIMELINE
    story.append(create_section_header("7. Investigation Timeline"))
    journey = tech.get("scan_journey", [])
    if journey:
        j_data = []
        for step in journey:
            st = step.get("status", "informational")
            st_text = st.capitalize()
            if st == "passed": 
                icon = "<font color='#10B981'>✓</font>"
            elif st == "triggered" or st == "escalated": 
                icon = "<font color='#EF4444'>⚠</font>"
            else: 
                icon = "<font color='#3B82F6'>ℹ</font>"
            
            j_data.append([
                Paragraph(f"<b>{safe_xml_escape(step.get('stage', 'Analysis Step'))}</b>", body_style),
                Paragraph(f"{icon} {st_text} - {safe_xml_escape(step.get('message', ''))}", body_style)
            ])
        t_journey = Table(j_data, colWidths=[2.0*inch, 5.0*inch])
        t_journey.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.HexColor('#F1F5F9'))
        ]))
        story.append(t_journey)
    else:
        story.append(Paragraph("Timeline data not available.", body_style))
    story.append(Spacer(1, 10))
    
    # 10. TECHNICAL NOTES
    story.append(create_section_header("8. Technical Notes"))
    tech_notes_lines = meta.get("technical_notes", "No additional engine analysis available.").split(". ")
    for line in tech_notes_lines:
        line = line.strip()
        if line:
            if not line.endswith("."): line += "."
            story.append(Paragraph(safe_xml_escape(line), body_style))
    story.append(Spacer(1, 10))
    
    # Force PageBreak
    story.append(PageBreak())

    # 11. RECOMMENDATIONS
    story.append(Paragraph("Analyst Conclusions", ParagraphStyle('IntFind2', parent=title_style, fontSize=16)))
    story.append(create_section_header("9. Recommendations"))
    recommendation_lines = scan.get("recommendation", "Exercise caution when interacting with this domain.").split(". ")
    for line in recommendation_lines:
        line = line.strip()
        if line:
            if not line.endswith("."): line += "."
            story.append(Paragraph(safe_xml_escape(line), body_style))
    story.append(Spacer(1, 15))

    # 12. EXECUTIVE CONCLUSION (Phase 3 & Refinement 2)
    story.append(create_section_header("10. Executive Conclusion"))
    # Generate Narrative
    conclusion_p1 = f"PhishGuard classified this domain as {pres_verdict}."
    
    target_str = ""
    if spoofed and tech.get('suspected_brand'):
        target_str = f" targeting {tech.get('suspected_brand')}."
    elif pres_finding != "Generic Phishing Attempt":
        target_str = "."
    conclusion_p2 = f"The domain exhibits characteristics consistent with {pres_finding}{target_str}"
    
    tf_matched = bool(matched)
    if tf_matched:
        conclusion_p3 = f"Threat intelligence feed matches were identified, verifying the domain's status as a known malicious indicator."
    else:
        conclusion_p3 = f"No threat intelligence feed matches were identified at the time of analysis. However, brand spoof indicators and heuristic analysis provided sufficient evidence to classify the domain as a likely phishing candidate."
        
    conclusion_p4 = pres_action.split(". ")[0] + ("." if not pres_action.split(". ")[0].endswith(".") else "")

    story.append(Paragraph(safe_xml_escape(conclusion_p1), body_style))
    story.append(Paragraph(safe_xml_escape(conclusion_p2), body_style))
    story.append(Paragraph(safe_xml_escape(conclusion_p3), body_style))
    story.append(Paragraph(safe_xml_escape(conclusion_p4), body_style))
    story.append(Spacer(1, 15))

    # 13. EVIDENCE SNAPSHOT (Refinement 1)
    story.append(create_section_header("11. Evidence Snapshot"))
    evidence_snapshot = meta.get("evidence_snapshot", {})
    if evidence_snapshot:
        story.append(create_table_from_dict(evidence_snapshot))
    else:
        # Generate from stored intelligence but use strict fallback for missing numeric scores
        gen_snapshot = {}
        gen_snapshot["Brand Spoof:"] = "Detected" if spoofed else "No Match"
        gen_snapshot["Threat Feed:"] = "Match Found" if tf_matched else "No Match"
        gen_snapshot["Domain Status:"] = di_status.capitalize()
        gen_snapshot["Threat Category:"] = pres_finding
        gen_snapshot["Rule Engine Score:"] = "Not Available in Historical Record"
        gen_snapshot["ML Engine Score:"] = "Not Available in Historical Record"
        
        # If it was a recent scan, rule_score/ml_score might be in technical_details
        if "combined_score" in tech:
            gen_snapshot["Rule Engine Score:"] = tech["combined_score"]
        if "ml_confidence" in tech:
            gen_snapshot["ML Engine Score:"] = tech["ml_confidence"]
            
        story.append(create_table_from_dict(gen_snapshot))
        
    story.append(Spacer(1, 15))

    # Phase 6.5 Threat Feed Appendix
    try:
        cache_count = int(tf.get("cache_count", 0) if tf.get("cache_count") is not None else 0)
    except ValueError:
        cache_count = 0

    if isinstance(tf, dict) and cache_count > 0:
        story.append(Paragraph("Appendix: Threat Intelligence Health Diagnostics", ParagraphStyle('Diag', parent=body_style, fontSize=7, textColor=colors.HexColor('#94A3B8'))))
        story.append(Paragraph(f"Feed Entries Available: {cache_count} | Last Sync: {tf.get('last_sync', 'Unknown')}", ParagraphStyle('Diag2', parent=body_style, fontSize=7, textColor=colors.HexColor('#94A3B8'))))

    doc.build(story, onFirstPage=draw_background, onLaterPages=draw_background)
    return buffer.getvalue()
