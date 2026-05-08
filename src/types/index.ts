
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Category = 'ADA' | 'GDPR' | 'Privacy' | 'Security' | 'AI' | 'Transactional' | 'HR_Edu' | 'Legal_Content';
export type ScanType = 'basic' | 'deep';
export type ReportType = 'SaaS' | 'Manual';

export interface Violation {
  category: Category;
  issue_type: string;
  severity: Severity;
  evidence_html: string; 
  snippet?: string;
  description: string;
  explanation: string;
  law_name: string;        
  potential_fine: string;  
  recommendation?: string;
  scan_type?: ScanType;
  report_type: ReportType;
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
