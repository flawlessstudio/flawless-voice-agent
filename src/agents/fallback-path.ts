import { CallSession } from '../runtime/session';
import { triggerFallback } from '../runtime/fallback';

export const FallbackPath = {
  async handle(session: CallSession, _body: Record<string, string>): Promise<string> {
    return triggerFallback(session, 'explicit-fallback-route');
  },
};
