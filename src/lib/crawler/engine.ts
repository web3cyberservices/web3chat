
import { runCrawlTask } from './crawler';
import { 
  getBotStatus, 
  getNextQueueItem, 
  updateQueueStatus, 
  saveBotEvent, 
  testConnection
} from '@/lib/db';
import settings from '@/config/crawler-settings.json';
import { isUrlAllowed } from '@/config/robots-rules';
import { logger } from '../logger';

const DEFAULT_SLEEP = settings.scanIntervalMs || 5000; 
const IDLE_WAIT = 15000;    

/**
 * V29.0 Hardened Auditor Engine
 * 
 * - ABSOLUTE ISOLATION: Automated discovery and queueing of new links is DISABLED.
 * - TARGET LOCK: Only user-defined URLs from the terminal will be audited.
 * - SECURITY: Port 80/443 restriction is enforced at the scraper layer.
 */

// Shared state across all worker threads in this process
const lastScanByDomain = new Map<string, number>();

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWorker(workerId: number) {
  logger.info(`[Worker ${workerId}] V29.0 Bootstrapped. Monitoring targeted audits only.`);
  
  while (true) {
    try {
      const active = await getBotStatus();
      if (!active) {
        await sleep(5000);
        continue;
      }

      const task = await getNextQueueItem();
      if (!task) {
        await sleep(IDLE_WAIT); 
        continue;
      }

      const urlStr = task.url;
      let domain = '';
      try {
        const url = new URL(urlStr);
        domain = url.hostname.toLowerCase();
        
        // Final Security Gate: Reject raw IPs or forbidden ports
        if (url.port && !['80', '443'].includes(url.port)) {
          throw new Error('Forbidden port');
        }
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        if (ipRegex.test(domain)) {
          throw new Error('IP-based auditing forbidden');
        }

      } catch (e: any) {
        logger.error(`[Worker ${workerId}] Access Denied for ${urlStr}: ${e.message}`);
        await updateQueueStatus(task.id, 'failed');
        continue;
      }
      
      const robotsCheck = await isUrlAllowed(urlStr);
      if (!robotsCheck.allowed) {
        logger.info(`[Worker ${workerId}] Skipping ${urlStr}: ${robotsCheck.reason}`);
        await updateQueueStatus(task.id, 'failed');
        continue;
      }

      // Politeness: Check if we need to wait for this specific domain
      const dynamicDelay = robotsCheck.delay || DEFAULT_SLEEP;
      const lastScan = lastScanByDomain.get(domain) || 0;
      const now = Date.now();
      const timeSinceLastScan = now - lastScan;
      
      if (timeSinceLastScan < dynamicDelay) {
        const wait = dynamicDelay - timeSinceLastScan;
        logger.info(`[Worker ${workerId}] [Polite] Respecting Crawl-delay for ${domain}: Waiting ${Math.round(wait)}ms`);
        await sleep(wait);
      }

      logger.info(`[Worker ${workerId}] Starting targeted audit: ${domain}`);
      await saveBotEvent('START', `Compliance Scan [Worker ${workerId}]: ${domain}`);
      
      let taskStatus: 'completed' | 'failed' = 'completed';

      try {
        const result = await runCrawlTask(task.url);
        
        // Update shared domain timestamp
        lastScanByDomain.set(domain, Date.now()); 
        
        if (result.status === 'failed' || result.status === 'blocked') {
          taskStatus = 'failed';
        }
        
        // V29.0: AUTO-DISCOVERY DISABLED. 
        // We no longer add discoveredLinks to the queue to prevent web-crawling.
        
      } catch (taskError: any) {
        logger.error(`[Worker ${workerId}] Task error for ${domain}: ${taskError.message}`);
        taskStatus = 'failed';
        
        if (taskError.message.includes('RATE_LIMITED')) {
          const retryMatch = taskError.message.match(/_RETRY_(\d+)/);
          const waitSeconds = retryMatch ? parseInt(retryMatch[1], 10) : 30;
          logger.warn(`[Worker ${workerId}] [Backoff] Server requested wait: ${waitSeconds}s for ${domain}.`);
          await saveBotEvent('ERROR', `Rate Limit for ${domain}. Waiting ${waitSeconds}s.`);
          await sleep(waitSeconds * 1000);
        }
      } finally {
        await updateQueueStatus(task.id, taskStatus);
      }

      await sleep(1000);
    } catch (error: any) {
      logger.error(`[Worker ${workerId}] Engine Loop Error: ${error.message}`);
      await sleep(10000);
    }
  }
}

export async function startEngine() {
  logger.info('==================================================');
  logger.info('   HUMANGO BOT COMPLIANCE ENGINE v29.0            ');
  logger.info('   MODE: TARGETED AUDIT (DISCOVERY DISABLED)      ');
  logger.info(`   Concurrency: ${settings.maxConcurrency} parallel workers  `);
  logger.info('==================================================');
  
  try {
    await testConnection();
    await saveBotEvent('SUCCESS', `Engine started with ${settings.maxConcurrency} workers.`);
  } catch (err: any) {
    logger.error(`FATAL: Database unreachable. Reason: ${err.message}`);
    return;
  }

  const concurrency = settings.maxConcurrency || 1;
  const workers = [];

  for (let i = 0; i < concurrency; i++) {
    workers.push(runWorker(i + 1));
  }

  await Promise.all(workers);
}
