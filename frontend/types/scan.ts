export interface ScanRequest {
  url: string;
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
  technical_details: any;
  recommendation: string;
  created_at: string;
}
