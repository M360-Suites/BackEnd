import * as Sentry from '@sentry/node';
import { Express } from 'express';
import { logger } from '../logger/logger';

export function initMonitoring(app: Express) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
  });

  logger.info('Sentry monitoring initialized');
}

// Export Sentry so it can be used in error handling
export { Sentry };
