import { CallSession } from './session';

export async function triggerFallback(session: CallSession, reason: string): Promise<string> {
  console.warn(`Fallback triggered for ${session.callSid}: ${reason}`);
  // TODO: route to human agent or schedule callback via Twilio
  return `<Response><Say>Let me connect you with a team member.</Say><Hangup/></Response>`;
}
