import dotenv from 'dotenv';
import { pollAllCourts, cleanupSnapshots } from './services/poller.js';
import { logger } from './logger.js';
import './db.js';

dotenv.config();

const pollInterval = Number(process.env.POLL_INTERVAL_MS || 120000);

async function runLoop() {
  logger.info('Worker poll started');
  await pollAllCourts();
  await cleanupSnapshots();
  logger.info('Worker poll completed');
}

await runLoop();
setInterval(runLoop, pollInterval);
