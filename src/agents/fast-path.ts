import { CallSession, SessionStore } from '../runtime/call-session.js';
import { createRealtimeSession, sendUserMessage, closeRealtimeSession } from '../llm/openai-realtime.js';
import { checkConsent, captureConsent } from '../compliance/consent.js';
import { recordFailure, recordSuccess } from '../runtime/circuit-breaker.js';
import { upsertContact, logCall } from '../integrations/hubspot.js';
import { logger } from '../analytics/logger.js';
import { SYSTEM_PROMPT } from '../prompts/system.js';

export const FastPath = {
  async handle(session: CallSession, body: Record<string, string>): Promise<string> {
    logger.info({ sessionId: session.sessionId }, 'Fast path start');

    // Compliance: consent check
    const from = body.From || '';
    const hasConsent = await checkConsent(from);
    if (!hasConsent) {
      logger.warn({ from }, 'Consent check failed — aborting call');
      return `<Response><Say>I'm sorry, I'm unable to proceed with this call. Goodbye.</Say><Hangup/></Response>`;
    }

    await captureConsent(session.sessionId, from);
    SessionStore.update(session.callSid, { consentCaptured: true });

    try {
      // OpenAI Realtime session
      let responseText = '';
      const realtimeSession = createRealtimeSession(
        SYSTEM_PROMPT,
        (delta) => { responseText += delta; },
        async () => {
          // On response complete: synthesize and CRM sync
          recordSuccess('fast-path');
          SessionStore.update(session.callSid, { turns: session.turns + 1 });
          try {
            await upsertContact({ phone: from, lastCallDate: new Date().toISOString() });
            await logCall({ sessionId: session.sessionId, callSid: session.callSid });
            SessionStore.update(session.callSid, { crmSynced: true });
          } catch (e) {
            logger.warn({ err: e }, 'CRM sync failed');
          }
        }
      );

      // Initial greeting
      sendUserMessage(realtimeSession, 'Call started');

      // Return TwiML with WebSocket stream for media
      closeRealtimeSession(realtimeSession);

      void responseText; // reserved for future inline-TwiML use once streaming is wired end-to-end

      return `<Response>
  <Say voice="Polly.Joanna">Hi, this is Alex, an AI voice agent from Flawless. Is now a good time to talk?</Say>
  <Gather input="speech" timeout="5" action="/twilio/gather">
  </Gather>
</Response>`;
    } catch (err) {
      recordFailure('fast-path');
      logger.error({ err, sessionId: session.sessionId }, 'Fast path error');
      throw err;
    }
  },
};
