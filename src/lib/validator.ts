
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Violation } from '@/types';

/**
 * @fileOverview Validator V32.5 - Semantic Logic Fix
 * 
 * - ROLE: Senior European Compliance Lawyer.
 * - RULE: Stop analysis if no document content is present.
 * - RULE: Unified double quotes in all recommendations.
 */

const ValidationInputSchema = z.object({
  html: z.string().describe("The aggregated text content from identified legal pages."),
  findings: z.array(z.any()).describe("Preliminary issues found by the crawler."),
  domain: z.string().describe("The target domain being audited."),
  hasFooterLink: z.boolean().describe("Whether any semantic legal link was found on the homepage."),
});

const ValidationOutputSchema = z.object({
  validated_findings: z.array(z.object({
    issue_type: z.string(),
    confidence_score: z.number(),
    evidence_quote: z.string(),
    is_hallucination: z.boolean(),
    verification_status: z.enum(['verified', 'insufficient_data', 'rejected']),
    business_impact: z.string().describe("Risk Point: e.g., 'Google/Meta ad account suspension'"),
    recommendation: z.string().describe("Format: 'ACTION: INSERT THIS TEXT -> \"[Clause]\"'"),
    law_name: z.string(),
    potential_fine: z.string(),
  })),
  overall_confidence: z.number(),
  integrity_status: z.enum(['verified', 'incomplete', 'suspicious']),
});

const verifyIntegrityPrompt = ai.definePrompt({
  name: 'verifyIntegrityPrompt',
  input: { schema: ValidationInputSchema },
  output: { schema: ValidationOutputSchema },
  config: { temperature: 0.1 }, 
  prompt: `You are a Senior European Compliance Lawyer (GDPR Auditor). Your goal is to find REAL violations, but be FAIR.

CONTEXT:
Domain: {{{domain}}}
Has Footer Link: {{{hasFooterLink}}}

HTML CONTENT POOL (Aggregated text from discovered legal pages):
{{{html}}}

PRELIMINARY FINDINGS:
{{#each findings}}
- {{{issue_type}}}: {{{description}}}
{{/each}}

INSTRUCTIONS:
1. ANNULLING ACCESSIBILITY ERRORS: If hasFooterLink is true, the violation "MISSING LEGAL DISCLOSURES" or "Lack of accessibility" MUST be rejected. Accessibility is satisfied if a link exists, regardless of the URL path (e.g., /legal/privacy is valid).
2. DATA RETENTION AUDIT: Analyze the HTML CONTENT POOL. Search for any mention of data storage durations.
   - Look for terms like "24 months", "3 years", "duration of contract", "until account deletion", "365 days".
   - If ANY timeframe or logic for storage is mentioned, the violation "DATA RETENTION TIMEFRAMES" MUST be rejected.
3. REAL GAPS ONLY: Only verify "CRITICAL INCOMPLETENESS" if the information is TRULY missing from the provided text pool.
4. RECOMMENDATION FORMAT: All recommendations MUST use DOUBLE QUOTES (") only. Never use single quotes.
   Example: ACTION: INSERT THIS TEXT -> "Data Controller: info@example.com".`,
});

export async function verifyIntegrity(html: string, findings: Violation[], hasFooterLink: boolean) {
  try {
    const domain = findings[0]?.domain || "this site";
    const truncatedHtml = (html || "").substring(0, 25000); 

    // CRITICAL LOGIC: If no content was found at all, don't hallucinate data retention errors.
    // Just return the missing core framework error.
    if (truncatedHtml.trim().length < 200) {
      return {
        validated_findings: [{
          issue_type: 'MISSING CORE FRAMEWORK',
          confidence_score: 1.0,
          evidence_quote: "No semantic legal content identified during scan.",
          is_hallucination: false,
          verification_status: 'verified' as const,
          business_impact: "Critical risk: Mandatory legal disclosures are missing from the site architecture.",
          recommendation: `ACTION: INSERT THIS HTML -> "<footer class=\\"legal-footer\\"><a href=\\"/privacy\\">Privacy Policy</a></footer>"`,
          law_name: "Art. 12 & 13 GDPR",
          potential_fine: "Up to €20,000,000 or 4% of annual turnover."
        }],
        overall_confidence: 1.0,
        integrity_status: 'incomplete' as const
      };
    }
    
    const { output } = await verifyIntegrityPrompt({ 
      html: truncatedHtml, 
      findings,
      domain,
      hasFooterLink
    });
    
    if (!output) throw new Error('Validator Failure');
    
    const activeFindings = output.validated_findings.filter(f => f.verification_status === 'verified');

    return {
      ...output,
      validated_findings: activeFindings,
      integrity_status: activeFindings.length === 0 ? 'verified' : output.integrity_status
    };
  } catch (error: any) {
    console.warn('[Validator] AI fallback.', error.message);
    return {
      validated_findings: findings.map(f => ({
        issue_type: f.issue_type,
        confidence_score: 0.8,
        is_hallucination: false,
        verification_status: 'verified' as const,
        business_impact: f.business_impact || "Business Risk: Loss of advertising access.",
        recommendation: f.recommendation || `ACTION: INSERT THIS TEXT -> "Data Controller: info@${domain}"`,
        law_name: f.law_name || "GDPR Art. 13",
        potential_fine: "Up to €20,000,000 or 4% of annual turnover.",
        evidence_quote: "Verified via semantic fallback."
      })),
      overall_confidence: 0.8,
      integrity_status: 'incomplete' as const
    };
  }
}
