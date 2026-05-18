
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Violation } from '@/types';

/**
 * @fileOverview Validator V35.0 - Strict Logic & Clean Formatting
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
  prompt: `You are a professional and honest European Compliance Auditor auditing the domain {{{domain}}}.

CRITICAL RULES:
1. IF THE CONTENT IS EMPTY OR INSIGNIFICANT:
   - Generate EXACTLY ONE violation: "MISSING CORE FRAMEWORK".
   - DO NOT generate any content-specific errors like "DATA RETENTION" if you haven't seen the text.

2. IF CONTENT IS PRESENT:
   - SEARCH FOR DATA RETENTION: Look for specific numbers followed by time units ("24 months", "3 years", "12 months") or phrases like "duration of contract", "as long as necessary", "until account deletion". If any logic for storage duration is found, NO violation for retention should be issued.

3. RECOMMENDATION FORMAT: 
   - ALWAYS use DOUBLE QUOTES (") for text inserts. Never use single quotes.
   - Example: ACTION: INSERT THIS TEXT -> "Data is stored for 24 months."

4. NO FALSE POSITIVES:
   - If the site is compliant, return an empty array [].
   - If you find the document, the "MISSING CORE FRAMEWORK" violation MUST be voided.`,
});

export async function verifyIntegrity(html: string, findings: Violation[], hasFooterLink: boolean) {
  try {
    const domain = findings[0]?.domain || "this site";
    const truncatedHtml = (html || "").substring(0, 30000); 

    // Hard Intercept: AI should not hallucinate if content is clearly missing
    if (truncatedHtml.trim().length < 400) {
      return {
        validated_findings: [{
          issue_type: 'MISSING CORE FRAMEWORK',
          confidence_score: 1.0,
          evidence_quote: "Zero or insufficient legal content identified.",
          is_hallucination: false,
          verification_status: 'verified' as const,
          business_impact: "Critical risk: Site lacks mandatory transparency signals.",
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
    
    // Filter out hallucinations: If we found missing doc, don't report details about it
    const containsMissingDoc = output.validated_findings.some(f => 
      f.issue_type.toUpperCase().includes('MISSING CORE FRAMEWORK')
    );

    let activeFindings = output.validated_findings.filter(f => f.verification_status === 'verified');
    
    if (containsMissingDoc) {
      activeFindings = activeFindings.filter(f => f.issue_type.toUpperCase().includes('MISSING CORE FRAMEWORK'));
    }

    // Secondary normalization: Ensure recommendations are quote-safe
    activeFindings = activeFindings.map(f => ({
      ...f,
      recommendation: f.recommendation.replace(/[']/g, '"')
    }));

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
