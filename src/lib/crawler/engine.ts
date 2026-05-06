/**
 * @fileOverview Основной координатор краулера.
 * Управляет циклом работы, обработкой ошибок БД и очередью.
 */

import { runCrawlTask } from './crawler';
import { 
  getBotStatus, 
  getNextQueueItem, 
  removeFromQueue, 
  saveBotEvent, 
  addToQueue, 
  getQueueSize 
} from '@/lib/db';

const SLEEP_INTERVAL = 1500; 
const IDLE_WAIT = 5000;    
const MAX_QUEUE_LIMIT = 5000; // Лимит на размер очереди для стабильности

let errorBackoffMs = 1000; // Стартовое время ожидания при ошибке БД

export async function startEngine() {
  await saveBotEvent('START', 'Движок HumangoBot инициализирован и перешел в режим мониторинга очереди.');

  while (true) {
    try {
      // 1. Проверка статуса (может выбросить ошибку если БД недоступна)
      const isActive = await getBotStatus();
      
      // Сброс backoff если запрос прошел успешно
      errorBackoffMs = 1000;

      if (!isActive) {
        console.log('[Engine] Bot is paused. Sleeping...');
        await sleep(IDLE_WAIT);
        continue;
      }

      // 2. Управление очередью и Discovery
      const queueSize = await getQueueSize();
      if (queueSize === 0) {
        const placeholderTarget = generateDiscoveryTarget();
        console.log(`[Engine] Queue empty. Discovering new target: ${placeholderTarget}`);
        await addToQueue(placeholderTarget);
        await sleep(IDLE_WAIT);
        continue;
      }

      // 3. Получение задачи
      const task = await getNextQueueItem();
      if (!task) {
        await sleep(IDLE_WAIT);
        continue;
      }

      // 4. Выполнение (внутри crawler.ts есть AbortSignal.timeout для защиты от зависаний)
      console.log(`[Engine] Processing: ${task.url}`);
      const result = await runCrawlTask(task.url);

      // 5. Удаление из очереди (всегда удаляем, чтобы не виснуть на failed URL)
      await removeFromQueue(task.id);

      // 6. Discovery новых ссылок (только если очередь не переполнена)
      if (queueSize < MAX_QUEUE_LIMIT && result.status === 'success') {
         // В реальной системе здесь был бы поиск новых ссылок на странице
         // Для демонстрации добавим еще один случайный узел
         await addToQueue(generateDiscoveryTarget());
      }

      await sleep(SLEEP_INTERVAL);

    } catch (error: any) {
      console.error(`[Engine Critical] ${error.message}`);
      
      // Логируем ошибку, если это возможно (БД может быть недоступна)
      try {
        await saveBotEvent('ERROR', `Критический сбой цикла: ${error.message}. Повтор через ${errorBackoffMs/1000}с.`);
      } catch (e) {
        // Игнорируем ошибку логирования при падении БД
      }

      // Экспоненциальная пауза при ошибках (backoff)
      await sleep(errorBackoffMs);
      errorBackoffMs = Math.min(errorBackoffMs * 2, 60000); // Максимум 1 минута
    }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateDiscoveryTarget(): string {
  const clusters = ['alpha', 'beta', 'gamma', 'delta', 'omega'];
  const tlds = ['.com', '.net', '.org', '.io', '.app'];
  const id = Math.floor(Math.random() * 1000);
  const cluster = clusters[Math.floor(Math.random() * clusters.length)];
  const tld = tlds[Math.floor(Math.random() * tlds.length)];
  return `https://${cluster}-node-${id}${tld}`;
}
