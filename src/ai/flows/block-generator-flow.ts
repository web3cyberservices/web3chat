'use server';
/**
 * @fileOverview AI Generator for Builder Blocks.
 * Generates compelling titles and descriptions based on block type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BlockGeneratorInputSchema = z.object({
  type: z.string().describe('The type of block to generate content for (e.g., hero, features, pricing)'),
  context: z.string().optional().describe('Context about the business or website topic'),
});

const BlockGeneratorOutputSchema = z.object({
  title: z.string().describe('A catchy title'),
  description: z.string().describe('A persuasive description'),
  buttonText: z.string().optional().describe('Text for the call-to-action button'),
});

export async function generateBlockContent(input: z.infer<typeof BlockGeneratorInputSchema>) {
  return blockGeneratorFlow(input);
}

const blockGeneratorFlow = ai.defineFlow(
  {
    name: 'blockGeneratorFlow',
    inputSchema: BlockGeneratorInputSchema,
    outputSchema: BlockGeneratorOutputSchema,
  },
  async (input) => {
    const prompt = ai.definePrompt({
      name: 'blockGeneratorPrompt',
      input: { schema: BlockGeneratorInputSchema },
      output: { schema: BlockGeneratorOutputSchema },
      prompt: `You are a high-conversion copywriter for a Web3 no-code builder.
      Generate content for a "{{type}}" block.
      Topic context: {{context}}
      
      Make it modern, futuristic, and trust-inspiring.`,
    });

    const { output } = await prompt(input);
    return output!;
  }
);
