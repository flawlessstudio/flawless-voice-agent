import { CallSession, SessionStore } from '../runtime/call-session.js';
import { createRealtimeSession, sendUserMessage, closeRealtimeSession } from '../llm/openai-realtime.js';
import type { RealtimeSession } from '../llm/openai-realtime.js';
import { checkConsent, captureConsent } from '../compliance/consent.js';
import { recordFailure, recordSuccess } from '../runtime/circuit-breaker.js';
import { upsertContact, logCall } from '../integrations/hubspot.js';
import { logger } from '../analytics/logger.js';
import { SYSTEM_PROMPT } from '../prompts/system.js';
import WebSocket from 'ws';

const REALTIME_OPEN_TIMEOUT_MS = 5000;

function waitForRealtimeOpen(session: RealtimeSession, timeoutMs = REALTIME_OPEN_TIMEOUT_MS): Promise<void> {
  if (session.ws.readyState === WebSocket.OPEN) return Promise.resolve();
  if (session.ws.readyState !== WebSocket.CONNECTING) {
    return Promise.reject(
      new Error(`Realtime session is not connectable (readyState=${session.ws.readyState})`)
    );
  }

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      session.ws.off('open', onOpen);
      session.ws.off('error', onError);
      session.ws.off('close', onClose);
    };

    const onOpen = () => {
      cleanup();
      resolve();
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const onClose = () => {
      cleanup();
      reject(new Error('Realtime session closed before opening'));
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for realtime session open after ${timeoutMs}ms`));
    }, timeoutMs);

    session.ws.on('open', onOpen);
    session.ws.on('error', onError);
    session.ws.on('close', onClose);
  });
}

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

    let realtimeSession: RealtimeSession | null = null;
    let lifecycleFinalized = false;

    const finalizeRealtimeLifecycle = async (reason: 'done' | 'error'): Promise<void> => {
      if (lifecycleFinalized || !realtimeSession) return;
      lifecycleFinalized = true;

      if (reason === 'done') {
        recordSuccess('fast-path');
        SessionStore.update(session.callSid, { turns: session.turns + 1 });
      } else {
        recordFailure('fast-path');
      }

      if (reason === 'done') {
        try {
          const contactId = await upsertContact({ phone: from, lastCallDate: new Date().toISOString() });
          await logCall({ sessionId: session.sessionId, callSid: session.callSid, contactId });
          SessionStore.update(session.callSid, { crmSynced: true });
        } catch (e) {
          logger.warn({ err: e }, 'CRM sync failed');
        }
      }

      closeRealtimeSession(realtimeSession);
    };

    try {
      // OpenAI Realtime session
      let responseText = '';
      realtimeSession = createRealtimeSession(
        SYSTEM_PROMPT,
        (delta) => { responseText += delta; },
        async () => {
          if (responseText.trim()) {
            logger.info({ sessionId: session.sessionId, chars: responseText.length }, 'Fast path response complete');
          }
          await finalizeRealtimeLifecycle('done');
        }
      );

      realtimeSession.ws.on('error', (err: Error) => {
        logger.error({ err, sessionId: session.sessionId }, 'Fast path realtime session error');
        void finalizeRealtimeLifecycle('error');
      });

      // Initial greeting
      await waitForRealtimeOpen(realtimeSession);
      sendUserMessage(realtimeSession, 'Call started');

      // Return TwiML with WebSocket stream for media
      return `<Response>
  <Say voice="Polly.Joanna">Hi, this is Alex, an AI voice agent from Flawless. Is now a good time to talk?</Say>
  <Gather input="speech" timeout="5" action="/twilio/gather">
  </Gather>
</Response>`;
    } catch (err) {
      await finalizeRealtimeLifecycle('error');
      logger.error({ err, sessionId: session.sessionId }, 'Fast path error');
      throw err;
    }
  },
};
