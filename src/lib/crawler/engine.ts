
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
const MAX_QUEUE_LIMIT = 100000; // Увеличенный лимит для Auto-Discovery

export async function startEngine() {
  console.log('[Engine] HumangoBot EU Compliance Engine starting with Auto-Discovery...');
  
  try {
    await testConnection();
    await saveBotEvent('SUCCESS', 'Движок HumangoBot запущен. Режим Auto-Discovery активен.');
  } catch (err) {
    console.error('[Engine] FATAL: Database unreachable.');
    return;
  }

  while (true) {
    try {
      console.log(`[Engine] Cycle heartbeat at ${new Date().toLocaleTimeString()}`);
      
      // Принудительно активен для игнорирования отсутствующей таблицы настроек
      const isActive = true; 
      console.log('[Engine] Forced start: ignoring pause settings.');

      const task = await getNextQueueItem();
      
      if (!task) {
        console.log('[Engine] Queue is empty. Waiting...');
        await sleep(IDLE_WAIT); 
        continue;
      }

      console.log(`[Engine] Processing: ${task.url} (Depth: ${task.depth})`);
      let taskStatus: 'completed' | 'failed' = 'completed';

      try {
        const result = await runCrawlTask(task.url);
        
        if (result.status === 'failed') {
          taskStatus = 'failed';
        }

        // --- Auto-Discovery Logic ---
        if (result.status === 'success' && result.discoveredLinks && result.discoveredLinks.length > 0) {
          const currentQueueSize = await getQueueSize();
          
          if (currentQueueSize < MAX_QUEUE_LIMIT) {
            console.log(`[Engine] Auto-Discovery: Found ${result.discoveredLinks.length} new potential EU targets.`);
            
            for (const link of result.discoveredLinks) {
              // Добавляем внешние ссылки в очередь с базовым приоритетом
              // Внутренние ссылки (если бы они были) могли бы иметь более высокий приоритет
              await addToQueue(link, 0, 1); 
            }
          } else {
            console.log('[Engine] Queue limit reached. Skipping auto-discovery for this task.');
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
