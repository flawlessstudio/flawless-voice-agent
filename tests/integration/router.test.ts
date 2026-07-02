import { sessionRouter } from '../../src/runtime/router';
import { SessionStore } from '../../src/runtime/call-session';
import { isOpen } from '../../src/runtime/circuit-breaker';
import { FastPath } from '../../src/agents/fast-path';
import { DeepPath } from '../../src/agents/deep-path';
import { FallbackPath } from '../../src/agents/fallback-path';

jest.mock('../../src/runtime/call-session', () => ({
  SessionStore: {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../src/runtime/circuit-breaker', () => ({
  isOpen: jest.fn(() => false),
}));

jest.mock('../../src/agents/fast-path', () => ({
  FastPath: { handle: jest.fn(async () => '<Response><Say>Fast</Say></Response>') },
}));

jest.mock('../../src/agents/deep-path', () => ({
  DeepPath: { handle: jest.fn(async () => '<Response><Say>Deep</Say></Response>') },
}));

jest.mock('../../src/agents/fallback-path', () => ({
  FallbackPath: { handle: jest.fn(async () => '<Response><Say>Fallback</Say></Response>') },
}));

type CallSession = {
  sessionId: string;
  callSid: string;
  path: 'fast' | 'deep' | 'fallback';
  status: 'active' | 'handed-off' | 'completed';
  turns: number;
  complexityScore: number;
  consentCaptured: boolean;
  crmSynced: boolean;
  startedAt: string;
};

const mockedSessionStore = SessionStore as unknown as {
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  get: jest.Mock;
  delete: jest.Mock;
};

const mockedIsOpen = isOpen as jest.MockedFunction<typeof isOpen>;
const mockedFastHandle = FastPath.handle as jest.MockedFunction<typeof FastPath.handle>;
const mockedDeepHandle = DeepPath.handle as jest.MockedFunction<typeof DeepPath.handle>;
const mockedFallbackHandle = FallbackPath.handle as jest.MockedFunction<typeof FallbackPath.handle>;

function makeSession(callSid = 'CA123'): CallSession {
  return {
    sessionId: 'sess_test',
    callSid,
    path: 'fast',
    status: 'active',
    turns: 0,
    complexityScore: 0,
    consentCaptured: false,
    crmSynced: false,
    startedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('sessionRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsOpen.mockReturnValue(false);
    mockedSessionStore.create.mockImplementation((callSid: string) => makeSession(callSid));
    mockedFastHandle.mockResolvedValue('<Response><Say>Fast</Say></Response>');
    mockedDeepHandle.mockResolvedValue('<Response><Say>Deep</Say></Response>');
    mockedFallbackHandle.mockResolvedValue('<Response><Say>Fallback</Say></Response>');
  });

  it('routes to fallback when both fast and deep breakers are open', async () => {
    mockedIsOpen.mockImplementation((key: string) => key === 'fast-path' || key === 'deep-path');

    const result = await sessionRouter.handleIncoming({ CallSid: 'CA125', From: '+15551234567' });

    expect(result).toContain('Fallback');
    expect(mockedFallbackHandle).toHaveBeenCalledTimes(1);
    expect(mockedFastHandle).not.toHaveBeenCalled();
    expect(mockedDeepHandle).not.toHaveBeenCalled();
    expect(mockedSessionStore.update).toHaveBeenCalledWith('CA125', { path: 'fallback' });
  });

  it('routes to deep when fast breaker is open, deep breaker is closed, and complexity is low', async () => {
    mockedIsOpen.mockImplementation((key: string) => key === 'fast-path');

    const result = await sessionRouter.handleIncoming({ CallSid: 'CA126', From: '+15551234567' });

    expect(result).toContain('Deep');
    expect(mockedDeepHandle).toHaveBeenCalledTimes(1);
    expect(mockedFallbackHandle).not.toHaveBeenCalled();
    expect(mockedSessionStore.update).toHaveBeenCalledWith('CA126', { complexityScore: 0 });
    expect(mockedSessionStore.update).toHaveBeenCalledWith('CA126', { path: 'deep' });
  });

  it('routes to fallback when RequiresDeepPath is true and deep breaker is open', async () => {
    mockedIsOpen.mockImplementation((key: string) => key === 'deep-path');

    const result = await sessionRouter.handleIncoming({
      CallSid: 'CA127',
      From: '+15551234567',
      RequiresDeepPath: 'true',
    });

    expect(result).toContain('Fallback');
    expect(mockedFallbackHandle).toHaveBeenCalledTimes(1);
    expect(mockedFastHandle).not.toHaveBeenCalled();
    expect(mockedDeepHandle).not.toHaveBeenCalled();
    expect(mockedSessionStore.update).toHaveBeenCalledWith('CA127', { path: 'fallback' });
  });
});
