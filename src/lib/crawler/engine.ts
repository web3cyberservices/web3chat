
import { runCrawlTask } from './crawler';
import { 
  getBotStatus, 
  getNextQueueItem, 
  updateQueueStatus, 
  saveBotEvent, 
  addToQueue, 
  getQueueSize,
  testConnection
} from '@/lib/db';

const SLEEP_INTERVAL = 1500; 
const IDLE_WAIT = 30000;    
const MAX_QUEUE_LIMIT = 50000;
const MAX_DEPTH_LIMIT = 3; // Лимит глубины для фокусировки на кол-ве сайтов

// EU TLDs для приоритизации
const EU_TLDS = ['.de', '.fr', '.it', '.es', '.pl', '.nl', '.be', '.at', '.dk', '.fi', '.se', '.ie', '.pt', '.cz', '.gr', '.hu', '.ro', '.sk', '.bg', '.ee', '.lv', '.lt', '.hr', '.si', '.mt', '.cy'];

export async function startEngine() {
  console.log('[Engine] HumangoBot EU Compliance Engine starting...');
  
  try {
    await testConnection();
    await saveBotEvent('SUCCESS', 'Движок HumangoBot запущен. Фокус: EU Compliance.');
  } catch (err) {
    console.error('[Engine] FATAL: Database unreachable.');
    return;
  }

  while (true) {
    try {
      console.log(`[Engine] Cycle heartbeat at ${new Date().toLocaleTimeString()}`);
      
      const isActive = await getBotStatus();
      if (!isActive) {
        console.log('[Engine] Engine is paused by settings.');
        await sleep(IDLE_WAIT);
        continue;
      }

      const task = await getNextQueueItem();
      
      if (!task) {
        console.log('[Engine] Queue is empty. Waiting...');
        await sleep(IDLE_WAIT); 
        continue;
      }

      console.log(`[Engine] Processing task: ${task.url} (Depth: ${task.depth})`);
      let taskStatus: 'completed' | 'failed' = 'completed';

      try {
        const result = await runCrawlTask(task.url);
        
        if (result.status === 'failed') {
          taskStatus = 'failed';
        }

        // Логика обнаружения ссылок и приоритизации
        const queueSize = await getQueueSize();
        if (queueSize < MAX_QUEUE_LIMIT && result.status === 'success' && result.discoveredLinks && task.depth < MAX_DEPTH_LIMIT) {
           for (const link of result.discoveredLinks) {
             const linkUrl = new URL(link);
             const isInternal = linkUrl.hostname === new URL(task.url).hostname;
             
             // Для внутренних ссылок увеличиваем глубину
             const nextDepth = isInternal ? task.depth + 1 : 0;
             
             // Если это новая внешняя ссылка, ставим приоритет если это EU TLD
             let priority = 0;
             if (!isInternal) {
               const isEu = EU_TLDS.some(tld => linkUrl.hostname.toLowerCase().endsWith(tld));
               priority = isEu ? 10 : 0;
             } else {
               // Внутренние ссылки имеют приоритет выше, чтобы дожать сайт до лимита глубины
               priority = 5;
             }

             await addToQueue(link, nextDepth, priority);
           }
        }
      } catch (taskError: any) {
        console.error(`[Engine] Task error:`, taskError.message);
        taskStatus = 'failed';
      } finally {
        await updateQueueStatus(task.id, taskStatus);
      }

      await sleep(SLEEP_INTERVAL);

    } catch (error: any) {
      console.error('[Engine Loop Error]', error.stack || error);
      await sleep(5000);
    }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
