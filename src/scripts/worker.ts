import 'dotenv/config';
/**
 * worker.ts - Modern Entry Point
 * This file bootstraps the specialized crawler engine.
 * Old zombie logic has been removed in favor of startEngine().
 */
import { startEngine } from '@/lib/crawler/engine';
import { logger } from '@/lib/logger';

async function main() {
  logger.info('BOOTSTRAP: Starting Audit Engine v2.0...');
  try {
    await startEngine();
  } catch (err: any) {
    logger.error(`FATAL BOOTSTRAP FAILURE: ${err.message}`);
    process.exit(1);
  }
}

main();
