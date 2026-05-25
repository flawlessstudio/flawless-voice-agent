import { sessionRouter } from '../../src/runtime/router';

jest.mock('../../src/runtime/session', () => ({
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

describe('sessionRouter', () => {
  it('routes to fast path by default', async () => {
    const result = await sessionRouter.handleIncoming({ CallSid: 'CA123', From: '+15551234567' });
    expect(result).toContain('Fast');
  });
});
