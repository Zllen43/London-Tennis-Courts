import dotenv from 'dotenv';
import { createApp } from './app.js';
import { logger } from './logger.js';

dotenv.config();

const app = createApp();
const port = process.env.PORT || 4000;

app.listen(port, () => {
  logger.info(`API listening on ${port}`);
});
