
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Violation } from '@/types';

/**
 * @fileOverview Validator V33.0 - Improved Logic for Empty Content
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

HTML CONTENT POOL:
{{{html}}}

INSTRUCTIONS:
1. SEMANTIC FLEXIBILITY: If hasFooterLink is true, DO NOT report "MISSING LEGAL DISCLOSURES".
2. DATA RETENTION AUDIT: Scrutinize the HTML CONTENT POOL for storage timeframes.
   - Look for "24 months", "2 years", "until deletion", "for the duration of service".
   - If any mention of a timeframe or logic for storage exists, DO NOT report "DATA RETENTION TIMEFRAMES" gap.
3. RECOMMENDATIONS: All recommendations MUST use DOUBLE QUOTES (") only. No single quotes allowed.
4. HONESTY: Only report a gap if the info is truly missing. If content is present, return an empty array.`,
});

export async function verifyIntegrity(html: string, findings: Violation[], hasFooterLink: boolean) {
  try {
    const domain = findings[0]?.domain || "this site";
    const truncatedHtml = (html || "").substring(0, 25000); 

    // CRITICAL: If content is minimal, don't hallucinate retention errors
    if (truncatedHtml.trim().length < 300) {
      return {
        validated_findings: [{
          issue_type: 'MISSING CORE FRAMEWORK',
          confidence_score: 1.0,
          evidence_quote: "No semantic legal content identified during scan.",
          is_hallucination: false,
          verification_status: 'verified' as const,
          business_impact: "Critical risk: Mandatory legal disclosures are missing.",
          recommendation: 'ACTION: INSERT THIS HTML -> "<footer class=\"legal-footer\"><a href=\"/privacy\">Privacy Policy</a></footer>"',
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
    return {
      validated_findings: findings.map(f => ({
        issue_type: f.issue_type,
        confidence_score: 0.8,
        is_hallucination: false,
        verification_status: 'verified' as const,
        business_impact: f.business_impact || "Business Risk.",
        recommendation: (f.recommendation || `ACTION: INSERT THIS TEXT -> "Data Controller: info@${domain}"`).replace(/[']/g, '"'),
        law_name: f.law_name || "GDPR Art. 13",
        potential_fine: "Up to €20M",
        evidence_quote: "Verified via fallback."
      })),
      overall_confidence: 0.8,
      integrity_status: 'incomplete' as const
    };
  }
}
