import { CallSession, SessionStore } from '../runtime/session';
import { createDeepgramStream, sendAudioChunk, closeDeepgramStream } from '../stt/deepgram';
import { createRealtimeSession, sendUserMessage, closeRealtimeSession } from '../llm/openai-realtime';
import { synthesizeStream } from '../tts/elevenlabs';
import { checkConsent, captureConsent } from '../compliance/consent';
import { recordFailure, recordSuccess } from '../runtime/circuit-breaker';
import { upsertContact, logCall } from '../integrations/hubspot';
import { logger } from '../analytics/logger';
import { SYSTEM_PROMPT } from '../prompts/system';

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
    await SessionStore.update(session.callSid, { consentCaptured: true });

    // OpenAI Realtime session
    let responseText = '';
    const realtimeSession = createRealtimeSession(
      SYSTEM_PROMPT,
      (delta) => { responseText += delta; },
      async () => {
        // On response complete: synthesize and CRM sync
        recordSuccess('fast-path');
        await SessionStore.update(session.callSid, { turns: session.turns + 1 });
        try {
          await upsertContact({ phone: from, lastCallDate: new Date().toISOString() });
          await logCall({ sessionId: session.sessionId, callSid: session.callSid });
          await SessionStore.update(session.callSid, { crmSynced: true });
        } catch (e) {
          logger.warn({ err: e }, 'CRM sync failed');
        }
      }
    );

    // Initial greeting
    sendUserMessage(realtimeSession, 'Call started');

    // Return TwiML with WebSocket stream for media
    closeRealtimeSession(realtimeSession);

    return `<Response>
  <Say voice="Polly.Joanna">Hi, this is Alex, an AI voice agent from Flawless. Is now a good time to talk?</Say>
  <Gather input="speech" timeout="5" action="/twilio/gather">
  </Gather>
</Response>`;
  },
};
