
'use server';
/**
 * @fileOverview Strict German & EU Statutory Audit AI
 * Analyzes domain data for high-risk Abmahnung (Fine) liabilities.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AuditInputSchema = z.object({
  domain: z.string().describe("The domain being audited."),
  violations: z.array(z.object({
    issue_type: z.string(),
    description: z.string(),
    law_name: z.string()
  })).describe("Raw violations found on the site.")
});

const AuditOutputSchema = z.object({
  report: z.array(z.object({
    title: z.string().describe("e.g., CRITICAL IMPRESSUM FAILURE"),
    law: z.string().describe("e.g., § 5 DDG (formerly TMG)"),
    summary: z.string().describe("Professional legal description of the gap."),
    impact: z.string().describe("Business impact: e.g., 'Risk of Abmahnung up to €50,000'."),
    liability: z.string().describe("Specific financial fine details."),
    action: z.string().describe("Remediation starting with 'ACTION: INSERT THIS TEXT ->'")
  }))
});

export type AuditOutput = z.infer<typeof AuditOutputSchema>;

export const legalAuditPrompt = ai.definePrompt({
  name: 'legalAuditPrompt',
  input: { schema: AuditInputSchema },
  output: { schema: AuditOutputSchema },
  prompt: `You are a professional German Data Protection Auditor.
Your task is to convert raw scan data into a formal statutory compliance report for domain: {{{domain}}}.

STRICT GERMAN COMPLIANCE RULES:
1. Impressumspflicht (§ 5 DDG): Every German site MUST list full company name, registered address, authorized representative (Geschäftsführer), Handelsregister number (HRB/HRA), and VAT ID (USt-IdNr.).
2. Cookie Consent (§ 25 TDDDG): "Reject All" button must be as easy as "Accept All" (Symmetrie-Gebot). Dark patterns are illegal.
3. US Data Transfers (Schrems II): Dynamic loading of Google Fonts or US-based scripts without prior consent is a €100-€5,000 fine per individual case, plus administrative fines.
4. E-commerce (§ 312j BGB): Final order button must say "Zahlungspflichtig bestellen" or "Kaufen".

Findings:
{{#each violations}}
- Violation: {{{issue_type}}}
- Details: {{{description}}}
- Law: {{{law_name}}}
{{/each}}

For each finding, provide authoritative legal analysis. 
Fines for Impressum errors start at €50,000. 
GDPR fines can reach 4% of global turnover.`,
});

export async function generateLegalAudit(input: z.infer<typeof AuditInputSchema>): Promise<AuditOutput> {
  const { output } = await legalAuditPrompt(input);
  return output!;
}
