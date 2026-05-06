/**
 * @fileOverview Основной координатор краулера.
 * Управляет циклом работы, проверкой статуса и обработкой очереди.
 */

import { runCrawlTask } from './crawler';
import { getBotStatus, getNextQueueItem, removeFromQueue, saveBotEvent, addToQueue } from '@/lib/db';

const SLEEP_INTERVAL = 1500; // ms (RFC 9309 compliance)
const IDLE_WAIT = 5000;    // ms (Wait if queue is empty or bot is paused)

export async function startEngine() {
  await saveBotEvent('START', 'Движок HumangoBot инициализирован и перешел в режим мониторинга очереди.');

  // Бесконечный цикл работы
  while (true) {
    try {
      // 1. Проверка глобального статуса (Пауза/Активен)
      const isActive = await getBotStatus();
      if (!isActive) {
        console.log('[Engine] Bot is paused. Sleeping...');
        await sleep(IDLE_WAIT);
        continue;
      }

      // 2. Получение следующей цели из очереди
      const task = await getNextQueueItem();
      
      if (!task) {
        // Если очередь пуста, генерируем случайную цель для поддержания активности (имитация обнаружения)
        const placeholderTarget = generateDiscoveryTarget();
        console.log(`[Engine] Queue empty. Discovering new target: ${placeholderTarget}`);
        await addToQueue(placeholderTarget);
        await sleep(IDLE_WAIT);
        continue;
      }

      // 3. Выполнение сканирования (включает robots.txt check, scraping, parsing, logging)
      console.log(`[Engine] Processing: ${task.url}`);
      const result = await runCrawlTask(task.url);

      // 4. Удаление из очереди после попытки обработки
      await removeFromQueue(task.id);

      // 5. Логирование завершения такта
      if (result.status === 'success') {
        console.log(`[Engine] Done: ${task.url} (${result.issuesFound} issues found)`);
      } else {
        console.log(`[Engine] Task ended with status: ${result.status} - ${result.reason || ''}`);
      }

      // 6. Пауза между запросами (Politeness Policy)
      await sleep(SLEEP_INTERVAL);

    } catch (error: any) {
      await saveBotEvent('ERROR', `Критический сбой в основном цикле движка: ${error.message}`);
      await sleep(IDLE_WAIT);
    }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Имитация процесса обнаружения новой инфраструктуры (Discovery)
 */
function generateDiscoveryTarget(): string {
  const domains = ['cloud', 'app', 'dev', 'sec', 'data', 'web', 'node', 'sync'];
  const tlds = ['.io', '.com', '.net', '.app'];
  const rand = Math.floor(Math.random() * 10000);
  const d = domains[Math.floor(Math.random() * domains.length)];
  const t = tlds[Math.floor(Math.random() * tlds.length)];
  return `https://${d}-infra-${rand}${t}`;
}
