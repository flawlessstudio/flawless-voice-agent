import { SessionStore } from './session';
import { FastPath } from '../agents/fast-path';
import { DeepPath } from '../agents/deep-path';
import { FallbackPath } from '../agents/fallback-path';

export const sessionRouter = {
  async handleIncoming(body: Record<string, string>): Promise<string> {
    const session = SessionStore.create(body.CallSid);

    // Route: default to fast, upgrade to deep if needed
    if (session.complexityScore > 0.7) {
      return DeepPath.handle(session, body);
    }
    return FastPath.handle(session, body);
  },

  async handleStatus(body: Record<string, string>): Promise<void> {
    await SessionStore.update(body.CallSid, { status: body.CallStatus });
  },
};
