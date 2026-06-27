
'use server';
/**
 * @fileOverview AI Ассистент для мессенджера Vortex.
 * Генерирует быстрые ответы и суммаризирует переписку.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatAssistantInputSchema = z.object({
  lastMessages: z.array(z.string()).describe('Последние сообщения в чате'),
  userMood: z.string().optional().describe('Настроение пользователя'),
});

const ChatAssistantOutputSchema = z.object({
  suggestedReplies: z.array(z.string()).describe('Варианты быстрых ответов'),
  summary: z.string().describe('Краткое содержание последних сообщений'),
});

export async function getChatAssistance(input: z.infer<typeof ChatAssistantInputSchema>) {
  return chatAssistantFlow(input);
}

const chatAssistantFlow = ai.defineFlow(
  {
    name: 'chatAssistantFlow',
    inputSchema: ChatAssistantInputSchema,
    outputSchema: ChatAssistantOutputSchema,
  },
  async (input) => {
    const prompt = ai.definePrompt({
      name: 'chatAssistantPrompt',
      input: { schema: ChatAssistantInputSchema },
      output: { schema: ChatAssistantOutputSchema },
      prompt: `Ты — умный помощник мессенджера Vortex. 
      Твоя задача: проанализировать сообщения и предложить 3 кратких ответа и резюме.
      Стиль ответов: дружелюбный, современный.
      
      Сообщения:
      {{#each lastMessages}}
      - {{this}}
      {{/each}}
      
      Учитывай настроение: {{userMood}}`,
    });

    const { output } = await prompt(input);
    return output!;
  }
);
