import { SessionStore } from '../../src/runtime/call-session';

describe('SessionStore', () => {
  it('creates a session with correct defaults', () => {
    const session = SessionStore.create('CA123');
    expect(session.callSid).toBe('CA123');
    expect(session.path).toBe('fast');
    expect(session.status).toBe('active');
    expect(session.consentCaptured).toBe(false);
  });
});
