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
    Escapes special characters and inserts zero-width spaces (\u200b)
    after key characters to allow ReportLab Paragraph to wrap long URLs.
    """
    if not url:
        return ""
    escaped = html.escape(url)
    for char in ['/', '?', '=', '.', '-', '_']:
        escaped = escaped.replace(char, f"{char}\u200b")
    # Specifically handle &amp; to avoid breaking it with zero-width spaces
    escaped = escaped.replace('&amp;', '&amp;\u200b')
    return escaped


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
        fontSize=22,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=12
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=14,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )
    
    mono_style = ParagraphStyle(
        'DocMono',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0F172A')
    )
    
    status = scan.get("status", "unknown").upper()
    score = scan.get("score", 0)
    
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
        fontSize=16,
        textColor=colors.HexColor('#2563EB') # Blue-600
    )
    meta_style = ParagraphStyle(
        'MetaText',
        parent=styles['Normal'],
        alignment=2, # Right aligned
        fontName='Helvetica',
        fontSize=8.5,
        textColor=colors.HexColor('#64748B')
    )
    
    header_data = [
        [
            Paragraph("<b>PhishGuard</b> <font color='#64748B'>| Threat Intelligence</font>", brand_style),
            Paragraph(f"<b>Generated:</b> {scan.get('created_at', '')[:19]}<br/><b>Report ID:</b> {scan.get('id', '')[:8]}...", meta_style)
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
    story.append(Spacer(1, 14))
    
    # Title
    story.append(Paragraph("Detailed Threat Analysis Report", title_style))
    story.append(Spacer(1, 4))
    
    # 2. Scanned URL Widget
    wrapped_url = _format_url_for_wrap(scan.get('url', ''))
    url_content_style = ParagraphStyle(
        'UrlContent',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=9.5,
        leading=13,
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
        ('PADDING', (0,0), (-1,-1), 10),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    story.append(url_table)
    story.append(Spacer(1, 14))
    
    # 3. Threat Score, Severity Banner & Model Confidence (Dynamic side-by-side)
    score_style = ParagraphStyle(
        'ScoreVal',
        parent=styles['Normal'],
        alignment=1, # Center
        fontName='Helvetica-Bold',
        fontSize=28,
        textColor=colors.HexColor('#0F172A'),
        leading=32
    )
    score_lbl_style = ParagraphStyle(
        'ScoreLbl',
        parent=styles['Normal'],
        alignment=1,
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.HexColor('#475569'),
        spaceAfter=4
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

    confidence_val = tech.get("confidence")
    if confidence_val is not None:
        confidence_pct = float(confidence_val) * 100
        conf_style = ParagraphStyle(
            'ConfVal',
            parent=styles['Normal'],
            alignment=1, # Center
            fontName='Helvetica-Bold',
            fontSize=28,
            textColor=colors.HexColor('#2563EB'), # Blue
            leading=32
        )
        conf_lbl_style = ParagraphStyle(
            'ConfLbl',
            parent=styles['Normal'],
            alignment=1,
            fontName='Helvetica-Bold',
            fontSize=9,
            textColor=colors.HexColor('#475569'),
            spaceAfter=4
        )
        score_status_data = [
            [
                [
                    Paragraph("THREAT SCORE", score_lbl_style),
                    Paragraph(f"{score}<font size=14 color='#64748B'>/100</font>", score_style)
                ],
                [
                    Paragraph("SEVERITY STATUS", status_lbl_style),
                    Paragraph(status, status_val_style)
                ],
                [
                    Paragraph("MODEL CONFIDENCE", conf_lbl_style),
                    Paragraph(f"{confidence_pct:.1f}<font size=14 color='#64748B'>%</font>", conf_style)
                ]
            ]
        ]
        score_status_table = Table(score_status_data, colWidths=[2.33*inch, 2.33*inch, 2.33*inch])
        score_status_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), colors.HexColor('#F8FAFC')),
            ('BACKGROUND', (1,0), (1,0), status_bg),
            ('BACKGROUND', (2,0), (2,0), colors.HexColor('#EFF6FF')), # Light blue
            ('BOX', (0,0), (0,0), 1, colors.HexColor('#E2E8F0')),
            ('BOX', (1,0), (1,0), 1, status_color),
            ('BOX', (2,0), (2,0), 1, colors.HexColor('#BFDBFE')),
            ('PADDING', (0,0), (-1,-1), 14),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
    else:
        score_status_data = [
            [
                [
                    Paragraph("THREAT SCORE", score_lbl_style),
                    Paragraph(f"{score}<font size=14 color='#64748B'>/100</font>", score_style)
                ],
                [
                    Paragraph("SEVERITY STATUS", status_lbl_style),
                    Paragraph(status, status_val_style)
                ]
            ]
        ]
        score_status_table = Table(score_status_data, colWidths=[3.5*inch, 3.5*inch])
        score_status_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), colors.HexColor('#F8FAFC')),
            ('BACKGROUND', (1,0), (1,0), status_bg),
            ('BOX', (0,0), (0,0), 1, colors.HexColor('#E2E8F0')),
            ('BOX', (1,0), (1,0), 1, status_color),
            ('PADDING', (0,0), (-1,-1), 14),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
    story.append(score_status_table)
    story.append(Spacer(1, 14))
    
    # 4. Findings Section
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
        
    story.append(Spacer(1, 12))
    
    # 5. Technical Details Grid
    story.append(Paragraph("Technical Parameters Audit", section_title_style))
    tech = scan.get("technical_details", {})
    if isinstance(tech, str):
        import json
        try:
            tech = json.loads(tech)
        except Exception:
            tech = {}
            
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
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 14))
    
    # 6. Recommendation Box
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
        ('PADDING', (0,0), (-1,-1), 10),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    story.append(rec_table)
    story.append(Spacer(1, 20))
    
    # 7. Footer
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
