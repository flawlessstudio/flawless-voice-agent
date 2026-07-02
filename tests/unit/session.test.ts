import { SessionStore } from '../../src/runtime/call-session';

let sidSeed = 0;

const nextSid = (): string => {
  sidSeed += 1;
  return `CA${sidSeed.toString().padStart(10, '0')}`;
};

describe('SessionStore', () => {
  it('creates a session with correct defaults', () => {
    const callSid = nextSid();
    const session = SessionStore.create(callSid);

    expect(session).toMatchObject({
      callSid,
      path: 'fast',
      status: 'active',
      turns: 0,
      complexityScore: 0,
      consentCaptured: false,
      crmSynced: false,
    });
    expect(session.sessionId).toBeTruthy();
    expect(SessionStore.get(callSid)).toEqual(session);
  });

  it('updates an existing session and persists field changes', () => {
    const callSid = nextSid();
    SessionStore.create(callSid);

    const updated = SessionStore.update(callSid, {
      path: 'deep',
      status: 'handed-off',
      turns: 3,
      complexityScore: 1,
      consentCaptured: true,
    });

    expect(updated).toMatchObject({
      callSid,
      path: 'deep',
      status: 'handed-off',
      turns: 3,
      complexityScore: 1,
      consentCaptured: true,
    });
    expect(SessionStore.get(callSid)).toEqual(updated);
  });

  it('returns null when updating an unknown session', () => {
    expect(SessionStore.update('CA_UNKNOWN', { path: 'deep' })).toBeNull();
  });

  it('returns null when getting an unknown session', () => {
    expect(SessionStore.get('CA_UNKNOWN')).toBeNull();
  });

  it('deletes existing sessions and safely ignores unknown sessions', () => {
    const callSid = nextSid();
    SessionStore.create(callSid);

    SessionStore.delete(callSid);
    expect(SessionStore.get(callSid)).toBeNull();
    expect(() => SessionStore.delete('CA_UNKNOWN')).not.toThrow();
  });

  it('allows callSid mutation in record while preserving original store key', () => {
    const callSid = nextSid();
    SessionStore.create(callSid);

    const updated = SessionStore.update(callSid, { callSid: 'CA_REKEYED' });

    expect(updated?.callSid).toBe('CA_REKEYED');
    expect(SessionStore.get('CA_REKEYED')).toBeNull();
    expect(SessionStore.get(callSid)?.callSid).toBe('CA_REKEYED');
  });
});
