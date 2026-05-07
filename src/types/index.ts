
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Category = 'ADA' | 'GDPR' | 'Privacy' | 'Security' | 'AI' | 'Transactional' | 'HR_Edu';
export type ScanType = 'basic' | 'deep';

export interface Violation {
  category: Category;
  issue_type: string;
  severity: Severity;
  evidence_html: string; // Snippet of the offending code
  description: string;
  explanation: string; // Legal/technical reasoning
  potential_penalty: string; // Estimated fine
  recommendation?: string;
  scan_type?: ScanType;
  metadata?: any;
}

export interface CrawlResult {
  url: string;
  timestamp: string;
  status: 'success' | 'failed' | 'blocked' | 'skipped';
  issuesFound: number;
  violations?: Violation[];
  scanType: ScanType;
  securityHeaders?: {
    ssl: string;
    hsts: boolean;
    csp: boolean;
  };
  error?: string;
  reason?: string;
  discoveredLinks?: string[];
}
