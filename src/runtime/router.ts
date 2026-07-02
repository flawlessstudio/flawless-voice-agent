import { SessionStore } from './call-session.js';
import { FastPath } from '../agents/fast-path.js';
import { DeepPath } from '../agents/deep-path.js';
import { FallbackPath } from '../agents/fallback-path.js';
import { isOpen } from './circuit-breaker.js';
import { logger } from '../analytics/logger.js';

// Keywords that signal the call needs multi-step reasoning, tool use or
// memory (BANT qualification, scheduling, escalation) rather than a single
// low-latency turn — these route to the deep path per the dual-path ADR.
const DEEP_PATH_SIGNALS = [
  'budget', 'presupuesto', 'pricing', 'precio',
  'schedule', 'agendar', 'meeting', 'reunión',
  'demo', 'proposal', 'propuesta',
  'human', 'agente humano', 'representative',
  'cancel', 'cancelar', 'complaint', 'queja',
];

/**
 * Scores how much reasoning/tool depth a call likely needs based on the
 * signals available at routing time (IVR digits, initial speech, explicit
 * flags from upstream orchestration). Returns 0 (trivial) to 1 (complex).
 */
export function computeComplexity(body: Record<string, string>): number {
  if (body.RequiresDeepPath === 'true') return 1;

  const text = `${body.SpeechResult ?? ''} ${body.Digits ?? ''}`.toLowerCase();
  if (!text.trim()) return 0;

  const hits = DEEP_PATH_SIGNALS.filter((kw) => text.includes(kw)).length;
  return Math.min(1, hits / 2);
}

const DEEP_PATH_THRESHOLD = 0.5;

// In-memory session map keyed by CallSid
const sessions = new Map<string, string>(); // callSid -> path

export const sessionRouter = {
  async handleIncoming(body: Record<string, string>): Promise<string> {
    const session = SessionStore.create(body.CallSid);

    logger.info({ callSid: body.CallSid, sessionId: session.sessionId }, 'Incoming call');

    // Fast path circuit breaker open → fallback
    if (isOpen('fast-path') && isOpen('deep-path')) {
      logger.warn('Both fast and deep path circuit breakers open — routing to fallback');
      sessions.set(body.CallSid, 'fallback');
      SessionStore.update(body.CallSid, { path: 'fallback' });
      return FallbackPath.handle(session, body);
    }

    const complexity = computeComplexity(body);
    SessionStore.update(body.CallSid, { complexityScore: complexity });

    if (complexity >= DEEP_PATH_THRESHOLD && !isOpen('deep-path')) {
      sessions.set(body.CallSid, 'deep');
      SessionStore.update(body.CallSid, { path: 'deep' });
      return DeepPath.handle(session, body);
    }

    if (complexity >= DEEP_PATH_THRESHOLD && isOpen('deep-path')) {
      logger.warn('Deep path circuit breaker open for complex call — routing to fallback');
      sessions.set(body.CallSid, 'fallback');
      SessionStore.update(body.CallSid, { path: 'fallback' });
      return FallbackPath.handle(session, body);
    }

    if (isOpen('fast-path')) {
      logger.warn('Fast path circuit breaker open — routing to deep path');
      sessions.set(body.CallSid, 'deep');
      SessionStore.update(body.CallSid, { path: 'deep' });
      return DeepPath.handle(session, body);
    }

    sessions.set(body.CallSid, 'fast');
    return FastPath.handle(session, body);
  },

  async handleStatus(body: Record<string, string>): Promise<void> {
    if (body.CallStatus === 'completed') {
      SessionStore.delete(body.CallSid);
      sessions.delete(body.CallSid);
    }
    logger.info({ callSid: body.CallSid, status: body.CallStatus }, 'Call status update');
  },
};
