'use server';
/**
 * @fileOverview AI Агент для аудита веб-сайтов.
 * Анализирует домен на предмет уязвимостей, SEO и качества кода.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SiteAuditInputSchema = z.object({
  url: z.string().describe('URL или домен сайта для анализа'),
});

const SiteAuditOutputSchema = z.object({
  securityScore: z.number().min(0).max(100).describe('Оценка безопасности'),
  seoScore: z.number().min(0).max(100).describe('Оценка SEO'),
  vulnerabilities: z.array(z.string()).describe('Список найденных уязвимостей'),
  seoIssues: z.array(z.string()).describe('Проблемы с SEO'),
  recommendations: z.array(z.string()).describe('Рекомендации по улучшению'),
  summary: z.string().describe('Краткое резюме аудита'),
});

export async function analyzeSite(input: z.infer<typeof SiteAuditInputSchema>) {
  return siteAuditFlow(input);
}

const siteAuditFlow = ai.defineFlow(
  {
    name: 'siteAuditFlow',
    inputSchema: SiteAuditInputSchema,
    outputSchema: SiteAuditOutputSchema,
  },
  async (input) => {
    const prompt = ai.definePrompt({
      name: 'siteAuditPrompt',
      input: { schema: SiteAuditInputSchema },
      output: { schema: SiteAuditOutputSchema },
      prompt: `Ты — эксперт по кибербезопасности и SEO-оптимизации. 
      Проведи виртуальный аудит сайта: {{url}}.
      
      Твоя задача:
      1. Предположи типичные уязвимости для данного типа ресурса или на основе общедоступных данных о его архитектуре.
      2. Проанализируй SEO-показатели (мета-теги, заголовки, скорость загрузки).
      3. Оцени качество кода и предложи улучшения.
      
      Верни ответ в строго структурированном JSON формате.`,
    });

    const { output } = await prompt(input);
    return output!;
  }
);
