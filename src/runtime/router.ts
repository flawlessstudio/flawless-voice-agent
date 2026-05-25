import { SessionStore, CallSession } from './session';
import { FastPath } from '../agents/fast-path';
import { DeepPath } from '../agents/deep-path';
import { FallbackPath } from '../agents/fallback-path';
import { isOpen } from './circuit-breaker';
import { logger } from '../analytics/logger';

export const sessionRouter = {
  async handleIncoming(body: Record<string, string>): Promise<string> {
    const session = SessionStore.create(body.CallSid);
    await SessionStore.save(session);

    logger.info({ callSid: body.CallSid, sessionId: session.sessionId }, 'Incoming call');

    // Fast path circuit breaker open → fallback
    if (isOpen('fast-path')) {
      logger.warn('Fast path circuit breaker open — routing to fallback');
      return FallbackPath.handle(session, body);
    }

    // Deep path if complexity high
    if (session.complexityScore > 0.7) {
      return DeepPath.handle(session, body);
    }

    return FastPath.handle(session, body);
  },

  async handleStatus(body: Record<string, string>): Promise<void> {
    await SessionStore.update(body.CallSid, {
      status: body.CallStatus === 'completed' ? 'completed' : 'failed',
      endedAt: new Date().toISOString(),
    });
    logger.info({ callSid: body.CallSid, status: body.CallStatus }, 'Call status update');
  },
};
