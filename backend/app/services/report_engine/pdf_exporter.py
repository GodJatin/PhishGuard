from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
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
            
    # Status colors
    if status == 'SAFE':
        status_color = colors.HexColor('#10B981')  # Emerald Green
        status_bg = colors.HexColor('#D1FAE5')
    elif status == 'SUSPICIOUS':
        status_color = colors.HexColor('#F59E0B')  # Amber Yellow
        status_bg = colors.HexColor('#FEF3C7')
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
        textColor=colors.HexColor('#2563EB')
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
    story.append(Spacer(1, 2))
    
    # 2. Scanned URL Widget
    wrapped_url = _format_url_for_wrap(scan.get('url') or scan.get('scanned_url', ''))
    url_content_style = ParagraphStyle(
        'UrlContent',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#1E293B')
    )
    
    url_data = [
        [Paragraph("<b>Target URL:</b>", ParagraphStyle('UrlLbl', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#475569')))],
        [Paragraph(wrapped_url, url_content_style)]
    ]
    url_table = Table(url_data, colWidths=[7*inch])
    url_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    story.append(url_table)
    story.append(Spacer(1, 10))
    
    # Check if this is a comparison report
    if scan_type == "comparison":
        rule_res = tech.get("rule_based_result", {})
        ml_res = tech.get("ml_result", {})
        
        score_lbl_style = ParagraphStyle(
            'ScoreLblComp',
            parent=styles['Normal'],
            alignment=1,
            fontName='Helvetica-Bold',
            fontSize=9,
            textColor=colors.HexColor('#475569')
        )
        score_val_style = ParagraphStyle(
            'ScoreValComp',
            parent=styles['Normal'],
            alignment=1,
            fontName='Helvetica-Bold',
            fontSize=22,
            textColor=colors.HexColor('#0F172A'),
            leading=26
        )
        
        rule_status = rule_res.get("status", "SAFE").upper()
        ml_status = ml_res.get("status", "SAFE").upper()
        
        def get_status_hex(s):
            if s == 'SAFE': return '#10B981'
            if s == 'SUSPICIOUS': return '#F59E0B'
            return '#EF4444'
            
        rule_color = colors.HexColor(get_status_hex(rule_status))
        ml_color = colors.HexColor(get_status_hex(ml_status))
        
        score_data = [
            [
                [
                    Paragraph("RULE-BASED SCAN SCORE", score_lbl_style),
                    Paragraph(f"{rule_res.get('score', 0)}<font size=11 color='#64748B'>/100</font>", score_val_style),
                    Paragraph(f"<b>STATUS: {rule_status}</b>", ParagraphStyle('RStat', parent=score_lbl_style, alignment=1, textColor=rule_color))
                ],
                [
                    Paragraph("ML DETECTION ENGINE SCORE", score_lbl_style),
                    Paragraph(f"{ml_res.get('score', 0)}<font size=11 color='#64748B'>/100</font>", score_val_style),
                    Paragraph(f"<b>STATUS: {ml_status}</b><br/><font size=8 color='#64748B'>Confidence: {float(ml_res.get('confidence', 0))*100:.1f}%</font>", ParagraphStyle('MStat', parent=score_lbl_style, alignment=1, textColor=ml_color))
                ]
            ]
        ]
        score_table = Table(score_data, colWidths=[3.5*inch, 3.5*inch])
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), colors.HexColor('#F8FAFC')),
            ('BACKGROUND', (1,0), (1,0), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (0,0), 1.2, rule_color),
            ('BOX', (1,0), (1,0), 1.2, ml_color),
            ('PADDING', (0,0), (-1,-1), 10),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(score_table)
        story.append(Spacer(1, 10))
        
        # Engine Findings Comparison Table
        story.append(Paragraph("Comparison of Findings", section_title_style))
        
        rule_reasons = rule_res.get("reasons", [])
        ml_reasons = ml_res.get("reasons", [])
        
        rule_p_list = [Paragraph("<b>Rule-Based Detections:</b>", ParagraphStyle('RLbl', parent=body_style, fontName='Helvetica-Bold'))]
        if rule_reasons:
            for r in rule_reasons:
                rule_p_list.append(Paragraph(f"<font color='{rule_color.hexval()}'><b>•</b></font> {safe_xml_escape(r)}", body_style))
        else:
            rule_p_list.append(Paragraph("No rule violations triggered.", body_style))
            
        ml_p_list = [Paragraph("<b>ML Anomaly Findings:</b>", ParagraphStyle('MLbl', parent=body_style, fontName='Helvetica-Bold'))]
        if ml_reasons:
            for r in ml_reasons:
                ml_p_list.append(Paragraph(f"<font color='{ml_color.hexval()}'><b>•</b></font> {safe_xml_escape(r)}", body_style))
        else:
            ml_p_list.append(Paragraph("No model anomalies identified.", body_style))
            
        findings_data = [[rule_p_list, ml_p_list]]
        findings_table = Table(findings_data, colWidths=[3.5*inch, 3.5*inch])
        findings_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FAFAFA')),
        ]))
        story.append(findings_table)
        story.append(Spacer(1, 10))
        
        # Unified Threat Assessment details
        story.append(Paragraph("Unified Threat Assessment Summary", section_title_style))
        shared_inds = tech.get("shared_indicators", [])
        unique_rules = tech.get("unique_findings", {}).get("rule_based", [])
        unique_ml = tech.get("unique_findings", {}).get("ml", [])
        
        assessment_rows = [
            [
                Paragraph("<b>Primary Category:</b>", body_style),
                Paragraph(f"<b>{tech.get('threat_category', 'N/A')}</b>", body_style)
            ],
            [
                Paragraph("<b>Severity Tier:</b>", body_style),
                Paragraph(f"<b>{tech.get('severity_tier', 'N/A')}</b>", body_style)
            ],
            [
                Paragraph("<b>Consensus Rating:</b>", body_style),
                Paragraph(f"<b>{tech.get('consensus_level', 'N/A')}</b>", body_style)
            ]
        ]
        if shared_inds:
            assessment_rows.append([
                Paragraph("<b>Shared Indicators:</b>", body_style),
                Paragraph(", ".join(shared_inds), body_style)
            ])
        if unique_rules:
            assessment_rows.append([
                Paragraph("<b>Unique Heuristics:</b>", body_style),
                Paragraph(", ".join(unique_rules), body_style)
            ])
        if unique_ml:
            assessment_rows.append([
                Paragraph("<b>Unique ML Features:</b>", body_style),
                Paragraph(", ".join(unique_ml), body_style)
            ])
        assessment_rows.append([
            Paragraph("<b>Threat Score Difference:</b>", body_style),
            Paragraph(f"{tech.get('score_difference', 0)} points difference between engines", body_style)
        ])

        
        assessment_table = Table(assessment_rows, colWidths=[2.2*inch, 4.8*inch])
        assessment_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 5),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F8FAFC')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(assessment_table)
        story.append(Spacer(1, 10))
        
    else:
        # Standard Scan layout
        confidence_val = tech.get("confidence")
        
        # Typography and formatting
        score_lbl_style = ParagraphStyle(
            'ScoreLbl',
            parent=styles['Normal'],
            alignment=1,
            fontName='Helvetica-Bold',
            fontSize=9,
            textColor=colors.HexColor('#475569'),
            spaceAfter=4
        )
        score_style = ParagraphStyle(
            'ScoreVal',
            parent=styles['Normal'],
            alignment=1,
            fontName='Helvetica-Bold',
            fontSize=28,
            textColor=colors.HexColor('#0F172A'),
            leading=32
        )
        status_val_style = ParagraphStyle(
            'StatusVal',
            parent=styles['Normal'],
            alignment=1,
            fontName='Helvetica-Bold',
            fontSize=18,
            textColor=status_color,
            leading=22
        )
        status_lbl_style = ParagraphStyle(
            'StatusLbl', parent=score_lbl_style
        )
        
        category_val = tech.get("threat_category", "Generic Phishing Attempt")
        severity_tier_val = tech.get("severity_tier", "Informational")
        consensus_val = tech.get("consensus_level", "Moderate Confidence")
        
        col_widths = [2.33*inch, 2.33*inch, 2.33*inch]
        
        # Build first column text (includes confidence if present)
        col1_content = [
            Paragraph("THREAT INDEX SCORE", score_lbl_style),
            Paragraph(f"{score}<font size=14 color='#64748B'>/100</font>", score_style)
        ]
        if confidence_val is not None:
            col1_content.append(Paragraph(f"<font size=8 color='#2563EB'><b>Model Conf: {float(confidence_val)*100:.1f}%</b></font>", score_lbl_style))
            
        col2_content = [
            Paragraph("SEVERITY TIER / STATUS", status_lbl_style),
            Paragraph(severity_tier_val, status_val_style),
            Paragraph(f"<font size=8 color='#64748B'>Index Class: {status}</font>", score_lbl_style)
        ]
        
        col3_content = [
            Paragraph("PRIMARY CATEGORY / CONSENSUS", score_lbl_style),
            Paragraph(f"<b>{category_val}</b>", ParagraphStyle('CatStyle', parent=score_lbl_style, alignment=1, fontSize=9, leading=11, textColor=colors.HexColor('#0F172A'))),
            Paragraph(f"<font size=8 color='#64748B'>Rating: {consensus_val}</font>", score_lbl_style)
        ]
        
        score_status_data = [[col1_content, col2_content, col3_content]]
        score_status_table = Table(score_status_data, colWidths=col_widths)
        score_status_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), colors.HexColor('#F8FAFC')),
            ('BACKGROUND', (1,0), (1,0), status_bg),
            ('BACKGROUND', (2,0), (2,0), colors.HexColor('#EFF6FF')),
            ('BOX', (0,0), (0,0), 1, colors.HexColor('#E2E8F0')),
            ('BOX', (1,0), (1,0), 1, status_color),
            ('BOX', (2,0), (2,0), 1, colors.HexColor('#BFDBFE')),
            ('PADDING', (0,0), (-1,-1), 12),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(score_status_table)
        story.append(Spacer(1, 10))
        
        # Findings List
        story.append(Paragraph("Analysis Findings", section_title_style))
        reasons = scan.get("reasons", [])
        if reasons:
            reasons_list = []
            for r in reasons:
                escaped_r = safe_xml_escape(r)
                reasons_list.append([Paragraph(f"<font color='{status_color.hexval()}'><b>•</b></font> {escaped_r}", body_style)])
            reasons_table = Table(reasons_list, colWidths=[7*inch])
            reasons_table.setStyle(TableStyle([
                ('PADDING', (0,0), (-1,-1), 3),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            story.append(reasons_table)
        else:
            story.append(Paragraph("No suspicious features or threat indicators were triggered. The URL passed all rule matches.", body_style))
        story.append(Spacer(1, 10))

    # Explainable Scoring Breakdown (common to standard scans that have it)
    scoring_breakdown = tech.get("scoring_breakdown")
    if scoring_breakdown:
        story.append(Paragraph("Explainable Scoring Breakdown", section_title_style))
        breakdown_rows = []
        for b in scoring_breakdown:
            rule_name = b.get("rule", "Threat indicator triggered")
            pts = b.get("points", 0)
            sign = "+" if pts >= 0 else ""
            
            p_style = ParagraphStyle('PtsVal', parent=body_style, alignment=2, fontName='Helvetica-Bold')
            if pts > 0:
                p_style.textColor = colors.HexColor('#EF4444')
            else:
                p_style.textColor = colors.HexColor('#10B981')
                
            breakdown_rows.append([
                Paragraph(f"• {rule_name}", body_style),
                Paragraph(f"{sign}{pts} points", p_style)
            ])
        breakdown_table = Table(breakdown_rows, colWidths=[5.4*inch, 1.6*inch])
        breakdown_table.setStyle(TableStyle([
            ('PADDING', (0,0), (-1,-1), 4),
            ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(breakdown_table)
        story.append(Spacer(1, 10))

    # Phase 10: Educational Insight Box
    insight_text = tech.get("educational_insight")
    if insight_text:
        story.append(Paragraph("Why This Matters (Security Context)", section_title_style))
        insight_data = [
            [Paragraph("Educational Threat Insight:", ParagraphStyle('InsightTitle', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', textColor=colors.HexColor('#7C3AED')))],
            [Paragraph(safe_xml_escape(insight_text), ParagraphStyle('InsightContent', parent=body_style, fontSize=9, leading=13, textColor=colors.HexColor('#7C3AED')))]
        ]
        insight_table = Table(insight_data, colWidths=[7*inch])
        insight_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F5F3FF')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#DDD6FE')),
            ('PADDING', (0,0), (-1,-1), 8),
            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ]))
        story.append(insight_table)
        story.append(Spacer(1, 10))

    # Phase 10: Scan Journey Timeline
    journey = tech.get("scan_journey")
    if journey:
        story.append(Paragraph("Analyst Scan Journey Timeline", section_title_style))
        journey_rows = []
        for stage in journey:
            stage_name = stage.get("stage", "")
            stage_status = stage.get("status", "passed").upper()
            msg = stage.get("message", "")
            
            # Map status to color and symbol
            if stage_status == "PASSED":
                symbol = "[PASS]"
                color_hex = "#10B981"
            elif stage_status == "TRIGGERED":
                symbol = "[ALERT]"
                color_hex = "#EF4444"
            elif stage_status == "WARNING":
                symbol = "[WARN]"
                color_hex = "#F59E0B"
            elif stage_status == "CRITICAL":
                symbol = "[CRIT]"
                color_hex = "#B91C1C"
            else:
                symbol = "[INFO]"
                color_hex = "#64748B"
                
            status_style = ParagraphStyle(
                'JStatus',
                parent=body_style,
                fontName='Helvetica-Bold',
                textColor=colors.HexColor(color_hex),
                fontSize=8
            )
            journey_rows.append([
                Paragraph(stage_name, ParagraphStyle('JStage', parent=body_style, fontName='Helvetica-Bold')),
                Paragraph(symbol, status_style),
                Paragraph(safe_xml_escape(msg), ParagraphStyle('JMsg', parent=body_style, fontSize=8.5, leading=11))
            ])
            
        journey_table = Table(journey_rows, colWidths=[2.2*inch, 0.8*inch, 4.0*inch])
        journey_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 5),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FAFAFA')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(journey_table)
        story.append(Spacer(1, 10))

    # 3. Technical Details Grid
    story.append(Paragraph("Technical Parameters Audit", section_title_style))

    
    # Escape and format domain for wrapping
    domain_val = tech.get("domain", "N/A")
    domain_wrapped = _format_url_for_wrap(domain_val)
            
    tech_grid_data = [
        [
            Paragraph("<b>Target Domain:</b>", body_style),
            Paragraph(domain_wrapped, mono_style),
            Paragraph("<b>HTTPS Secured:</b>", body_style),
            Paragraph("Yes" if tech.get("https") else "No (Insecure)", ParagraphStyle('HttpsCol', parent=body_style, fontName='Helvetica-Bold', textColor=colors.HexColor('#10B981') if tech.get("https") else colors.HexColor('#EF4444')))
        ],
        [
            Paragraph("<b>URL Length:</b>", body_style),
            Paragraph(f"{tech.get('url_length', 0)} characters", body_style),
            Paragraph("<b>Subdomains:</b>", body_style),
            Paragraph(str(tech.get("subdomain_count", 0)), body_style)
        ],
        [
            Paragraph("<b>Contains IP Host:</b>", body_style),
            Paragraph("Yes (Suspicious)" if tech.get("contains_ip") else "No", body_style),
            Paragraph("<b>Suspicious TLD:</b>", body_style),
            Paragraph("Yes (High-risk)" if tech.get("suspicious_tld") else "No", body_style)
        ]
    ]
    
    if tech.get("path_depth") is not None or tech.get("query_parameter_count") is not None or tech.get("entropy_score") is not None:
        path_val = str(tech.get("path_depth", 0))
        query_val = str(tech.get("query_parameter_count", 0))
        entropy_val = f"{float(tech.get('entropy_score', 0.0)):.3f}"
        
        tech_grid_data.append([
            Paragraph("<b>Path Depth:</b>", body_style),
            Paragraph(path_val, body_style),
            Paragraph("<b>Query Parameters:</b>", body_style),
            Paragraph(query_val, body_style)
        ])
        tech_grid_data.append([
            Paragraph("<b>URL Entropy:</b>", body_style),
            Paragraph(entropy_val, body_style),
            Paragraph("<b>Redirect Pattern:</b>", body_style),
            Paragraph("Flagged" if tech.get("redirect_pattern_detected") else "Clean", body_style)
        ])
    else:
        tech_grid_data.append([
            Paragraph("<b>Redirect Pattern:</b>", body_style),
            Paragraph("Flagged" if tech.get("redirect_pattern_detected") else "Clean", body_style),
            Paragraph("", body_style),
            Paragraph("", body_style)
        ])
        
    tech_table = Table(tech_grid_data, colWidths=[1.8*inch, 1.7*inch, 1.8*inch, 1.7*inch])
    tech_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#F8FAFC')),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 10))
    
    # 4. Recommendation Box
    rec_title_style = ParagraphStyle(
        'RecTitle',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=3
    )
    rec_content_style = ParagraphStyle(
        'RecContent',
        parent=body_style,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1E3A8A')
    )
    
    rec_text = scan.get("recommendation", "No specific recommendation generated.")
    rec_escaped = safe_xml_escape(rec_text)
    rec_data = [
        [Paragraph("Security Recommendation:", rec_title_style)],
        [Paragraph(rec_escaped, rec_content_style)]
    ]
    rec_table = Table(rec_data, colWidths=[7*inch])
    rec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')), # Blue-50
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#BFDBFE')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    story.append(rec_table)
    story.append(Spacer(1, 15))
    
    # 5. Footer
    footer_style = ParagraphStyle(
        'FooterText',
        parent=styles['Normal'],
        alignment=1, # Center
        fontName='Helvetica-Bold',
        fontSize=8,
        textColor=colors.HexColor('#94A3B8')
    )
    story.append(Paragraph("Generated by PhishGuard Threat Intelligence Engine", footer_style))
    
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
