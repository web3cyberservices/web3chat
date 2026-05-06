/**
 * @fileOverview Централизованные интерфейсы для системы комплаенса.
 */

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Category = 'ADA' | 'GDPR' | 'Privacy' | 'Security';

export interface Violation {
  category: Category;
  issue_type: string;
  severity: Severity;
  evidence_html: string;
  line_number?: number;
  description: string;
}

export interface CrawlResult {
  url: string;
  timestamp: string;
  status: 'success' | 'failed' | 'blocked' | 'skipped';
  issuesFound: number;
  violations?: Violation[];
  securityHeaders?: {
    ssl: string;
    hsts: boolean;
    csp: boolean;
  };
  error?: string;
  reason?: string;
  discoveredLinks?: string[];
}
