export interface ScanRequest {
  url: string;
  scan_source?: string;
  scan_metadata?: {
    qr_image_name?: string;
    decoded_url?: string;
    domain_intelligence?: {
      created_date: string;
      domain_age_days: number;
      registrar: string;
    };
    threat_feeds?: {
      openphish_match: boolean;
      phishtank_match: boolean;
      urlhaus_match: boolean;
      matched_sources: string[];
      confidence: string;
    };
    [key: string]: string | number | boolean | string[] | Record<string, unknown> | null | undefined;
  };
}

export interface TechnicalDetails {
  https: boolean;
  domain: string;
  subdomain_count: number;
  url_length: number;
  contains_ip: boolean;
  suspicious_keywords_found: string[];
  suspicious_tld: boolean;
  redirect_pattern_detected: boolean;
  path_depth?: number;
  query_parameter_count?: number;
  entropy_score?: number;
  scoring_breakdown?: Array<{ rule: string; points: number }>;
  rule_based_result?: {
    score: number;
    status: string;
    reasons: string[];
  };
  ml_result?: {
    score: number;
    status: string;
    reasons: string[];
    confidence?: number;
  };
  shared_indicators?: string[];
  unique_findings?: {
    rule_based: string[];
    ml: string[];
  };
  score_difference?: number;
  // Phase 9 fields
  intelligence_flags?: string[];
  is_whitelisted?: boolean;
  whitelist_reason?: string;
  is_blacklisted?: boolean;
  blacklist_source?: string;
  brand_spoof_detected?: boolean;
  suspected_brand?: string;
  spoof_explanation?: string;
  spoof_type?: string;
  feature_importances?: Array<{
    feature: string;
    label: string;
    contribution_pct: number;
    is_active: boolean;
  }>;
  ml_interpretation?: string;
  // Phase 10 fields
  threat_category?: string;
  secondary_threat_tags?: string[];
  severity_tier?: string;
  consensus_level?: string;
  educational_insight?: string;
  scan_journey?: Array<{
    stage: string;
    status: 'passed' | 'triggered' | 'warning' | 'critical' | 'informational';
    message: string;
  }>;
}


export interface ScanResult {
  scan_id: string;
  scan_type: string;
  scanned_url: string;
  status: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS';
  score: number;
  reasons: string[];
  technical_details: TechnicalDetails;
  recommendation: string;
  timestamp: string;
  confidence?: number;
  scan_source?: string;
  scan_metadata?: any;
}

// Map the DB schema as well
export interface DBScan {
  id: string;
  user_id: string;
  url: string;
  scan_type: string;
  status: string;
  score: number;
  reasons: string[];
  technical_details: TechnicalDetails | Record<string, unknown>;
  recommendation: string;
  created_at: string;
  scan_source?: string;
  scan_metadata?: any;
}
