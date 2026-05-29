
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Violation } from '@/types';

/**
 * @fileOverview Validator V50.0 - Merciless German & EU Legal Intelligence
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

const germanComplianceAuditPrompt = ai.definePrompt({
  name: 'germanComplianceAuditPrompt',
  input: { schema: ValidationInputSchema },
  output: { schema: ValidationOutputSchema },
  config: { temperature: 0.1 }, 
  prompt: `You are a strict, merciless German Data Protection Auditor (Datenschutzbeauftragter) auditing the domain {{{domain}}}.
Target Jurisdiction: GERMANY (.de domains, or sites targeting German consumers).

Your task is to identify EXACT violations that lead to immediate fines (Abmahnung) under German law (DSGVO, DDG, UWG, TDDDG, BGB).

CRITICAL GERMAN COMPLIANCE CHECKLIST:

1. IMPRESSUMSPFLICHT (§ 5 DDG):
   - Check for: Legal Form (GmbH, UG, etc.), Managing Director (Geschäftsführer), Physical Address (No PO Boxes).
   - Commercial sites MUST have: Handelsregister (HRB/HRA), Amtsgericht, and VAT ID (USt-IdNr.).
   - E-commerce: Must have a clickable link to the EU ODR platform.
   - Flag as "INCOMPLETE_IMPRESSUM_DE" if missing.

2. COOKIE & TRACKING CONSENT (§ 25 TDDDG):
   - Symmetrie-Gebot: Rejecting cookies ("Alles ablehnen") must be as easy and prominent as accepting ("Alles akzeptieren").
   - Dark Patterns: If "Reject" is hidden or small, flag as "CONSENT_SYMMETRY_VIOLATION".
   - Vendors: Must list specific vendors and lifetimes.

3. US DATA TRANSFERS (Schrems II):
   - Google Fonts: Dynamic loading from fonts.googleapis.com without prior consent is ILLEGAL.
   - US CDNs: Using Cloudflare/Cloudfront without IP-anonymization markers in policy.
   - Flag as "ILLEGAL_US_DATA_TRANSFER".

4. DSGVO Art. 13/14:
   - Responsible entity (Verantwortlicher) name and contact required.
   - Legal Basis (Rechtsgrundlage): Must cite specific articles (e.g., Art. 6 Abs. 1 lit. f).
   - DPO details: Required if commercial/large scale.

5. E-COMMERCE (§ 312j BGB):
   - Checkout button must say "Zahlungspflichtig bestellen" or "Kaufen". "Anmelden" or "Weiter" is illegal for orders.

OUTPUT FORMAT:
- "recommendation" MUST start with: ACTION: INSERT THIS TEXT -> "[Specific German Clause]"
- NO FALSE POSITIVES.

Analyze the following content:
{{{html}}}
`
});

const generalIntegrityPrompt = ai.definePrompt({
  name: 'generalIntegrityPrompt',
  input: { schema: ValidationInputSchema },
  output: { schema: ValidationOutputSchema },
  config: { temperature: 0.1 }, 
  prompt: `You are a professional European Compliance Auditor auditing the domain {{{domain}}}.
Focus on Art. 13 GDPR requirements. Check for missing Privacy Policy, missing User Rights, and insecure data collection forms.
If content is empty, generate "MISSING_CORE_FRAMEWORK".`,
});

export async function verifyIntegrity(html: string, findings: Violation[], hasFooterLink: boolean) {
  try {
    const domain = findings[0]?.domain || "this site";
    const isGerman = domain.endsWith('.de') || domain.endsWith('.at') || html.toLowerCase().includes('impressum');
    const truncatedHtml = (html || "").substring(0, 35000); 

    if (truncatedHtml.trim().length < 400) {
      return {
        validated_findings: [{
          issue_type: 'MISSING_CORE_FRAMEWORK',
          confidence_score: 1.0,
          evidence_quote: "Zero or insufficient legal content identified.",
          is_hallucination: false,
          verification_status: 'verified' as const,
          business_impact: isGerman ? "Kritisch: Fehlende Rechtstexte führen zur sofortigen Abmahnung." : "Critical risk: Missing mandatory legal disclosures.",
          recommendation: isGerman ? 'ACTION: INSERT THIS HTML -> "<footer class=\"legal-footer\"><a href=\"/datenschutz\">Datenschutzerklärung</a> | <a href=\"/impressum\">Impressum</a></footer>"' : 'ACTION: INSERT THIS HTML -> "<footer class=\"legal-footer\"><a href=\"/privacy\">Privacy Policy</a></footer>"',
          law_name: isGerman ? "§ 5 DDG / Art. 13 DSGVO" : "Art. 12 & 13 GDPR",
          potential_fine: isGerman ? "Bis zu €50.000 (Impressum) / 4% Umsatz (DSGVO)" : "Up to €20,000,000 or 4% of annual turnover."
        }],
        overall_confidence: 1.0,
        integrity_status: 'incomplete' as const
      };
    }
    
    const promptToUse = isGerman ? germanComplianceAuditPrompt : generalIntegrityPrompt;
    
    const { output } = await promptToUse({ 
      html: truncatedHtml, 
      findings,
      domain,
      hasFooterLink
    });
    
    if (!output) throw new Error('Validator Failure');
    
    let activeFindings = output.validated_findings.filter(f => f.verification_status === 'verified');
    
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
