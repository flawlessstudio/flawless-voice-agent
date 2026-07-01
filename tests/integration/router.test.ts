import { sessionRouter } from '../../src/runtime/router';

jest.mock('../../src/runtime/call-session', () => ({
  SessionStore: {
    create: jest.fn(() => ({
      sessionId: 'sess_test',
      callSid: 'CA123',
      path: 'fast',
      status: 'active',
      turns: 0,
      complexityScore: 0,
      consentCaptured: false,
      crmSynced: false,
      startedAt: new Date().toISOString(),
    })),
    save: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('../../src/runtime/circuit-breaker', () => ({
  isOpen: jest.fn(() => false),
}));

jest.mock('../../src/agents/fast-path', () => ({
  FastPath: { handle: jest.fn(() => '<Response><Say>Fast</Say></Response>') },
}));

jest.mock('../../src/agents/deep-path', () => ({
  DeepPath: { handle: jest.fn(() => '<Response><Say>Deep</Say></Response>') },
}));

jest.mock('../../src/agents/fallback-path', () => ({
  FallbackPath: { handle: jest.fn(() => '<Response><Say>Fallback</Say></Response>') },
}));

describe('sessionRouter', () => {
  it('routes to fast path by default', async () => {
    const result = await sessionRouter.handleIncoming({ CallSid: 'CA123', From: '+15551234567' });
    expect(result).toContain('Fast');
  });

  it('routes to deep path when the caller signals a complex intent', async () => {
    const result = await sessionRouter.handleIncoming({
      CallSid: 'CA124',
      From: '+15551234567',
      SpeechResult: 'I want to discuss pricing and schedule a demo meeting',
    });
    expect(result).toContain('Deep');
  });

  it('routes to deep path when explicitly flagged by upstream orchestration', async () => {
    const result = await sessionRouter.handleIncoming({
      CallSid: 'CA125',
      From: '+15551234567',
      RequiresDeepPath: 'true',
    });
    expect(result).toContain('Deep');
  });
});
