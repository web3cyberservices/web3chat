'use server';
/**
 * @fileOverview AI Agent Tester.
 * Tests the current agent configuration in real-time.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TestAgentInputSchema = z.object({
  systemPrompt: z.string().describe('The current system instructions for the agent'),
  userMessage: z.string().describe('The message from the user'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
  })).optional().describe('Chat history'),
});

export async function testAgent(input: z.infer<typeof TestAgentInputSchema>) {
  const { systemPrompt, userMessage, history = [] } = input;

  const { text } = await ai.generate({
    messages: [
      { role: 'system', content: [{ text: systemPrompt }] },
      ...history.map(h => ({
        role: h.role as 'user' | 'model',
        content: [{ text: h.content }]
      })),
      { role: 'user', content: [{ text: userMessage }] }
    ],
  });

  return text;
}
