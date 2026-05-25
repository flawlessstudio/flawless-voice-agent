import { createClient, RedisClientType } from 'redis';
import { logger } from '../analytics/logger';

export interface CallSession {
  sessionId: string;
  callSid: string;
  startedAt: string;
  endedAt?: string;
  path: 'fast' | 'deep' | 'fallback';
  status: 'active' | 'completed' | 'failed' | 'handed-off';
  turns: number;
  complexityScore: number;
  consentCaptured: boolean;
  crmSynced: boolean;
  latencyP95Ms?: number;
}

let redis: RedisClientType | null = null;

async function getRedis(): Promise<RedisClientType> {
  if (!redis) {
    redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' }) as RedisClientType;
    redis.on('error', (err) => logger.error({ err }, 'Redis error'));
    await redis.connect();
  }
  return redis;
}

const TTL_SECONDS = 3600; // 1 hour

export const SessionStore = {
  create(callSid: string): CallSession {
    return {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      callSid,
      startedAt: new Date().toISOString(),
      path: 'fast',
      status: 'active',
      turns: 0,
      complexityScore: 0,
      consentCaptured: false,
      crmSynced: false,
    };
  },

  async save(session: CallSession): Promise<void> {
    try {
      const r = await getRedis();
      await r.setEx(`session:${session.callSid}`, TTL_SECONDS, JSON.stringify(session));
    } catch (e) {
      logger.warn({ err: e }, 'Session save failed — in-memory fallback');
    }
  },

  async get(callSid: string): Promise<CallSession | null> {
    try {
      const r = await getRedis();
      const raw = await r.get(`session:${callSid}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async update(callSid: string, patch: Partial<CallSession>): Promise<void> {
    const existing = await SessionStore.get(callSid);
    if (existing) {
      await SessionStore.save({ ...existing, ...patch });
    }
  },

  async delete(callSid: string): Promise<void> {
    try {
      const r = await getRedis();
      await r.del(`session:${callSid}`);
    } catch (e) {
      logger.warn({ err: e }, 'Session delete failed');
    }
  },
};
