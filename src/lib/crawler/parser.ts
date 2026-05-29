import * as cheerio from 'cheerio';

export interface ScanIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  category: 'GDPR' | 'Security' | 'Privacy';
}

/**
 * Lead Generation Module: Extracts potential contact emails for CRM.
 */
export function extractEmails(html: string): string[] {
  // Regex for emails, avoiding images or complex obfuscations
  const eRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const blacklist = ['sentry', 'google', 'facebook', 'example', 'wix', 'aws', 'github', 'npm'];
  
  const rawEmails = html.match(eRegex) || [];
  
  // Deduplicate and filter against common tech-stack accounts
  return [...new Set(rawEmails)].filter(e => {
    const lower = e.toLowerCase();
    return !blacklist.some(domain => lower.includes(domain));
  });
}

/**
 * Technical Audit Module: Identifies structural and protocol-level violations.
 */
export function parseContent(html: string, url: string): ScanIssue[] {
  const $ = cheerio.load(html);
  const issues: ScanIssue[] = [];

  // 1. SSL/HTTPS forms check
  $('form').each((_, el) => {
    const action = $(el).attr('action') || '';
    if (!action.startsWith('https') && !url.startsWith('https:')) {
      issues.push({
        type: 'UNSECURE_DATA_TRANSMISSION',
        category: 'GDPR',
        severity: 'critical',
        description: 'Sensitive form found transmitting data over unencrypted HTTP.'
      });
    }
  });

  // 2. Security Headers (Static analysis check)
  if (!html.includes('Content-Security-Policy') && !html.includes('X-Frame-Options')) {
    issues.push({
      type: 'MISSING_SECURITY_HEADERS',
      category: 'Security',
      severity: 'medium',
      description: 'The site is missing basic security headers (CSP or X-Frame-Options).'
    });
  }

  // 3. Known vulnerable frameworks
  if (html.includes('vulnerable-library.js')) {
    issues.push({
      type: 'OUTDATED_SOFTWARE',
      category: 'Security',
      severity: 'high',
      description: 'Detected a library with known vulnerabilities.'
    });
  }

  return issues;
}
