
/**
 * @fileOverview Централизованные интерфейсы для системы комплаенса.
 */

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface ScanIssue {
  type: string;
  severity: Severity;
  description: string;
  category: 'GDPR' | 'Security' | 'Privacy';
  impact?: string;
  remediation?: string;
}

export interface CrawlResult {
  url: string;
  timestamp: string;
  status: 'success' | 'failed' | 'blocked' | 'skipped';
  issuesFound: number;
  issues?: ScanIssue[];
  securityHeaders?: {
    ssl: string;
    hsts: boolean;
    csp: boolean;
  };
  error?: string;
  reason?: string;
}

export interface RobotsRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
}
