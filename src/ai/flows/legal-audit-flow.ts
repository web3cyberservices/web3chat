'use server';
/**
 * @fileOverview Strict German & EU Legal Audit Flow
 * Analyzes domain data for Abmahnung (Fine) risks under German/EU law.
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
    title: z.string().describe("e.g., CRITICAL INCOMPLETENESS"),
    law: z.string().describe("e.g., § 5 DDG (Impressumspflicht)"),
    summary: z.string().describe("Detailed factual description of the violation."),
    impact: z.string().describe("Business impact: e.g., 'Risk of Abmahnung up to €50,000'."),
    liability: z.string().describe("Specific financial fine detail."),
    action: z.string().describe("Remediation step starting with 'ACTION: INSERT THIS TEXT ->'")
  }))
});

export type AuditOutput = z.infer<typeof AuditOutputSchema>;

export const legalAuditPrompt = ai.definePrompt({
  name: 'legalAuditPrompt',
  input: { schema: AuditInputSchema },
  output: { schema: AuditOutputSchema },
  prompt: `You are a strict, merciless German Data Protection Auditor (Datenschutzbeauftragter). 
Your task is to convert raw scan findings into a professional statutory compliance report for domain: {{{domain}}}.

STRICT GERMAN COMPLIANCE RULES:
1. Impressumspflicht (§ 5 DDG): Every German site MUST have an easily accessible Impressum containing full company name, registered office address (PO Box illegal), and authorized representative (Geschäftsführer). 
2. Commercial requirements: Must list Handelsregisterauszug (HRB/HRA), the respective registration court (Amtsgericht), and VAT ID (USt-IdNr.).
3. Datenschutzerklärung (Art. 13 DSGVO): Missing specific legal bases (Art. 6 DSGVO) or responsible entity names is a critical violation.
4. Cookie Consent (TDDDG): "Reject All" button must be as easy as "Accept All".
5. Schrems II: External US loading of assets (like Google Fonts) without prior consent is an illegal international data transfer.

Findings to analyze:
{{#each violations}}
- Violation: {{{issue_type}}}
- Details: {{{description}}}
- Foundation: {{{law_name}}}
{{/each}}

For each violation, generate authoritative legal analysis. 
Fines for Impressum errors start at €50,000. 
GDPR fines: Up to €20M or 4% of global turnover.`,
});

export async function generateLegalAudit(input: z.infer<typeof AuditInputSchema>): Promise<AuditOutput> {
  const { output } = await legalAuditPrompt(input);
  return output!;
}