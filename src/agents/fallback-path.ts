import { CallSession } from '../runtime/call-session.js';
import { triggerFallback } from '../runtime/fallback.js';

export const FallbackPath = {
  async handle(session: CallSession, _body: Record<string, string>): Promise<string> {
    return triggerFallback(session, 'explicit-fallback-route');
  },
};
