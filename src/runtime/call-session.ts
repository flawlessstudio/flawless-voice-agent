/**
 * call-session.ts — lightweight routing session record for the dual-path
 * (fast / deep / fallback) agent router.
 *
 * This is intentionally distinct from `runtime/session.ts` `SessionStore`,
 * which holds the *full* in-memory call state (transcript, CRM state) for the
 * Twilio↔OpenAI Realtime media-stream bridge (`telephony/mediaStream.ts`).
 *
 * `CallSession` instead models the *routing* state consumed by the
 * fast/deep/fallback agents (`agents/fast-path.ts`, `agents/deep-path.ts`,
 * `agents/fallback-path.ts`) and the router (`runtime/router.ts`):
 * a small, serializable record keyed by Twilio CallSid.
 *
 * Per ADR-002 (Redis session), this in-memory Map is the reference
 * implementation; a Redis-backed implementation can swap in behind the same
 * `SessionStore` API without touching call sites.
 */

import { randomUUID } from 'crypto';
import { logger } from '../analytics/logger.js';

export type CallPath = 'fast' | 'deep' | 'fallback';
export type CallStatus = 'active' | 'handed-off' | 'completed';

export interface CallSession {
  sessionId: string;
  callSid: string;
  path: CallPath;
  status: CallStatus;
  turns: number;
  complexityScore: number;
  consentCaptured: boolean;
  crmSynced: boolean;
  startedAt: string;
}

const store = new Map<string, CallSession>();

export const SessionStore = {
  /** Create and register a new routing session for an inbound call. */
  create(callSid: string, path: CallPath = 'fast'): CallSession {
    const session: CallSession = {
      sessionId: randomUUID(),
      callSid,
      path,
      status: 'active',
      turns: 0,
      complexityScore: 0,
      consentCaptured: false,
      crmSynced: false,
      startedAt: new Date().toISOString(),
    };
    store.set(callSid, session);
    return session;
  },

  /** Fetch a routing session by CallSid, or null if unknown. */
  get(callSid: string): CallSession | null {
    return store.get(callSid) ?? null;
  },

  /** Merge a partial patch into the session identified by CallSid. */
  update(callSid: string | null, patch: Partial<CallSession>): CallSession | null {
    if (!callSid) return null;
    const existing = store.get(callSid);
    if (!existing) {
      logger.warn({ callSid }, '[call-session] update() on unknown session');
      return null;
    }
    const next = { ...existing, ...patch };
    store.set(callSid, next);
    return next;
  },

  /** Explicitly persist a session (used after mutating a returned object). */
  save(session: CallSession): void {
    store.set(session.callSid, session);
  },

  /** Remove a session from the store (call ended / evicted). */
  delete(callSid: string): void {
    store.delete(callSid);
  },
};
