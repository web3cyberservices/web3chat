import 'dotenv/config';
/**
 * @fileOverview Автономная точка входа для фонового воркера.
 */

import { startEngine } from '../lib/crawler/engine';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing in environment variables!');
}

async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('   HUMANGO BOT WORKER SERVICE v1.5                ');
  console.log('   Identity: bot.humango.app                      ');
  console.log('   Policy: RFC 9309 / GDPR Technical Audit        ');
  console.log('--------------------------------------------------');
  
  try {
    // Запуск основного движка
    await startEngine();
  } catch (error: any) {
    console.error('[Worker] Fatal Error during bootstrap:', error.message);
    process.exit(1);
  }
}

// Обработка системных сигналов для корректного завершения (Graceful Shutdown)
process.on('SIGINT', () => {
  console.log('\n[Worker] Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Worker] Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

bootstrap();
