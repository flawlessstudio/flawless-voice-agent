import { logger } from '../analytics/logger.js';

// Internal opt-out list (in production: connect to DNC registry API)
const internalOptOut = new Set<string>();

export async function checkDNC(phoneNumber: string): Promise<boolean> {
  // TODO: integrate with Twilio Lookup or DNC registry API
  if (internalOptOut.has(phoneNumber)) {
    logger.warn({ phoneNumber }, 'Number on internal DNC list');
    return false; // blocked
  }
  return true; // clear
}

export function addToOptOut(phoneNumber: string): void {
  internalOptOut.add(phoneNumber);
  logger.info({ phoneNumber }, 'Added to opt-out list');
}
