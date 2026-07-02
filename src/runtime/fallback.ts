import { CallSession, SessionStore } from './call-session.js';
import { logger } from '../analytics/logger.js';

export async function triggerFallback(session: CallSession, reason: string): Promise<string> {
  session.path = 'fallback';
  SessionStore.update(session.callSid, { path: 'fallback' });
  logger.warn({ callSid: session.callSid, reason }, 'Fallback triggered');
  // TODO: route to human agent or schedule callback via Twilio
  return `<Response><Say>Let me connect you with a team member.</Say><Hangup/></Response>`;
}
