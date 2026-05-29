
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Violation } from '@/types';

/**
 * @fileOverview Validator V40.0 - Strict German & EU Compliance Intelligence
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
    business_impact: z.string().describe("Risk Point: e.g., 'Immediate Abmahnung (Fine)'"),
    recommendation: z.string().describe("Format: 'ACTION: INSERT THIS TEXT -> \"[Clause]\"'"),
    law_name: z.string(),
    potential_fine: z.string(),
  })),
  overall_confidence: z.number(),
  integrity_status: z.enum(['verified', 'incomplete', 'suspicious']),
});

const generalIntegrityPrompt = ai.definePrompt({
  name: 'generalIntegrityPrompt',
  input: { schema: ValidationInputSchema },
  output: { schema: ValidationOutputSchema },
  config: { temperature: 0.1 }, 
  prompt: `You are a professional European Compliance Auditor auditing the domain {{{domain}}}.

CRITICAL RULES:
1. IF CONTENT IS EMPTY: Generate "MISSING CORE FRAMEWORK".
2. SEARCH FOR DATA RETENTION: Look for specific timeframes. If found, NO violation.
3. NO FALSE POSITIVES: Return [] if compliant.`,
});

const germanComplianceAuditPrompt = ai.definePrompt({
  name: 'germanComplianceAuditPrompt',
  input: { schema: ValidationInputSchema },
  output: { schema: ValidationOutputSchema },
  config: { temperature: 0.1 }, 
  prompt: `You are a strict, merciless German Data Protection Auditor (Datenschutzbeauftragter) auditing the domain {{{domain}}}.
Target Jurisdiction: GERMANY (.de domains).

Your task is to analyze the provided HTML text and identify EXACT violations that lead to immediate fines (Abmahnung) under German law (DSGVO, DDG, UWG, TDDDG).

CRITICAL GERMAN COMPLIANCE RULES TO CHECK:

1. IMPRESSUMSPFLICHT (§ 5 DDG):
   - The site MUST have an "Impressum".
   - MUST contain: Full company name, Geschäftsführer, Physical Address (NO PO Boxes).
   - Commercial: Handelsregister (HRB), Amtsgericht, and VAT ID (USt-IdNr.).
   - Flag as "INCOMPLETE_IMPRESSUM_DE" if any missing. Fine: Up to €50,000.

2. DATENSCHUTZERKLÄRUNG (Art. 13/14 DSGVO):
   - Must name the "Verantwortlicher" and state "Rechtsgrundlage" (Art. 6 DSGVO).
   - Flag as "GDPR_TRANSPARENCY_FAILURE".

3. GOOGLE FONTS / US ASSETS (Schrems II):
   - Dynamic loading of Google Fonts without consent violates Art. 6 DSGVO.
   - Flag as "ILLEGAL_US_DATA_TRANSFER".

4. COOKIE CONSENT (TDDDG):
   - "Alles ablehnen" (Reject All) button must exist and be visible.
   - Flag as "CONSENT_VIOLATION_TDDDG".

OUTPUT FORMAT:
- "recommendation" MUST be: ACTION: INSERT THIS TEXT -> "[Required German Legal Clause]"
- NO FALSE POSITIVES.

Analyze:
{{{html}}}
`
});

export async function verifyIntegrity(html: string, findings: Violation[], hasFooterLink: boolean) {
  try {
    const domain = findings[0]?.domain || "this site";
    const isGerman = domain.endsWith('.de') || domain.endsWith('.at');
    const truncatedHtml = (html || "").substring(0, 30000); 

    if (truncatedHtml.trim().length < 400) {
      return {
        validated_findings: [{
          issue_type: 'MISSING_CORE_FRAMEWORK',
          confidence_score: 1.0,
          evidence_quote: "Zero or insufficient legal content identified.",
          is_hallucination: false,
          verification_status: 'verified' as const,
          business_impact: isGerman ? "Kritisch: Fehlende Rechtstexte führen zur Abmahnung." : "Critical risk: Missing mandatory legal disclosures.",
          recommendation: isGerman ? 'ACTION: INSERT THIS HTML -> "<footer class=\"legal-footer\"><a href=\"/datenschutz\">Datenschutzerklärung</a></footer>"' : 'ACTION: INSERT THIS HTML -> "<footer class=\"legal-footer\"><a href=\"/privacy\">Privacy Policy</a></footer>"',
          law_name: isGerman ? "§ 5 DDG / Art. 13 DSGVO" : "Art. 12 & 13 GDPR",
          potential_fine: isGerman ? "Bis zu €50.000 (Impressum) / 4% Umsatz (DSGVO)" : "Up to €20,000,000 or 4% of annual turnover."
        }],
        overall_confidence: 1.0,
        integrity_status: 'incomplete' as const
      };
    }
    
    // Choose the strict German prompt for .de/.at domains, otherwise use general
    const promptToUse = isGerman ? germanComplianceAuditPrompt : generalIntegrityPrompt;
    
    const { output } = await promptToUse({ 
      html: truncatedHtml, 
      findings,
      domain,
      hasFooterLink
    });
    
    if (!output) throw new Error('Validator Failure');
    
    // Normalize and Filter
    let activeFindings = output.validated_findings.filter(f => f.verification_status === 'verified');
    
    // Secondary normalization: Ensure recommendations are quote-safe and follow the strict format
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
    console.error('[Validator Error]', error.message);
    return {
      validated_findings: [],
      overall_confidence: 0.5,
      integrity_status: 'incomplete' as const
    };
  }
}
