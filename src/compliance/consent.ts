import { logger } from '../analytics/logger.js';

export async function checkConsent(phoneNumber: string): Promise<boolean> {
  // TODO: check consent database and DNC registry
  logger.info({ phoneNumber }, 'Consent check');
  return true;
}

export async function captureConsent(sessionId: string, phoneNumber: string): Promise<void> {
  // TODO: persist consent record with timestamp
  logger.info({ sessionId, phoneNumber }, 'Consent captured');
}
