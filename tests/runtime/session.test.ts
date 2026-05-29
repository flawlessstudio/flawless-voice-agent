import { SessionStore } from '../../src/runtime/session.js';

describe('SessionStore', () => {
  let session: SessionStore;

  beforeEach(() => { session = new SessionStore(); });

  it('initialises with empty transcript and null callSid', () => {
    expect(session.transcript).toHaveLength(0);
    expect(session.callSid).toBeNull();
  });

  it('sets callSid correctly', () => {
    session.setCallSid('CA_test_123');
    expect(session.callSid).toBe('CA_test_123');
  });

  it('accumulates utterances in order', () => {
    session.addUtterance('agent', 'Hola, soy Alex.');
    session.addUtterance('user', 'Buenos días.');
    session.addUtterance('agent', '¿En qué puedo ayudarte?');
    expect(session.transcript).toHaveLength(3);
    expect(session.transcript[0].speaker).toBe('agent');
    expect(session.transcript[1].speaker).toBe('user');
    expect(session.transcript[1].text).toBe('Buenos días.');
  });

  it('sets endedAt on end()', () => {
    expect(session.endedAt).toBeNull();
    session.end();
    expect(session.endedAt).not.toBeNull();
  });

  it('toJSON includes all fields', () => {
    session.setCallSid('CA123');
    session.addUtterance('agent', 'Test');
    const json = session.toJSON();
    expect(json.callSid).toBe('CA123');
    expect(json.transcript).toHaveLength(1);
    expect(json.crm.hubspot).toBeNull();
    expect(json.crm.salesforce).toBeNull();
  });
});
