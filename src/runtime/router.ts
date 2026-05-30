import { SessionStore } from './session';
import { FastPath } from '../agents/fast-path';
import { DeepPath } from '../agents/deep-path';
import { FallbackPath } from '../agents/fallback-path';
import { isOpen } from './circuit-breaker';
import { logger } from '../analytics/logger';

// In-memory session map keyed by CallSid
const sessions = new Map<string, SessionStore>();

export const sessionRouter = {
  async handleIncoming(body: Record<string, string>): Promise<string> {
    const session = new SessionStore();
    session.setCallSid(body.CallSid);
    sessions.set(body.CallSid, session);

    logger.info({ callSid: body.CallSid, sessionId: session.sessionId }, 'Incoming call');

    // Fast path circuit breaker open → fallback
    if (isOpen('fast-path')) {
      logger.warn('Fast path circuit breaker open — routing to fallback');
      return FallbackPath.handle(session, body);
    }

    return FastPath.handle(session, body);
  },

  async handleStatus(body: Record<string, string>): Promise<void> {
    const session = sessions.get(body.CallSid);
    if (session && body.CallStatus === 'completed') {
      session.end();
    }
    logger.info({ callSid: body.CallSid, status: body.CallStatus }, 'Call status update');
  },
};
