import { CallSession } from './call-session';
import { logger } from '../analytics/logger.js';

export async function triggerFallback(session: CallSession, reason: string): Promise<string> {
  logger.warn({ callSid: session.callSid, reason }, 'Fallback triggered');
  // TODO: route to human agent or schedule callback via Twilio
  return `<Response><Say>Let me connect you with a team member.</Say><Hangup/></Response>`;
}
