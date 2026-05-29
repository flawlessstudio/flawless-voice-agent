import crypto from 'crypto';
import { validateTwilioSignature } from '../../src/utils/auth.js';

describe('validateTwilioSignature', () => {
  const authToken = 'test_auth_token_123';
  const url = 'https://example.com/incoming-call';
  const body = { CallSid: 'CA123', CallStatus: 'ringing' };

  function makeSignature(u: string, b: Record<string, string>, token: string) {
    const sorted = Object.keys(b).sort();
    let str = u;
    for (const k of sorted) str += k + b[k];
    return crypto.createHmac('sha1', token).update(Buffer.from(str)).digest('base64');
  }

  it('returns true for valid signature', () => {
    const sig = makeSignature(url, body, authToken);
    expect(
      validateTwilioSignature({ 'x-twilio-signature': sig }, body, url, authToken)
    ).toBe(true);
  });

  it('returns false for invalid signature', () => {
    expect(
      validateTwilioSignature({ 'x-twilio-signature': 'bad_sig' }, body, url, authToken)
    ).toBe(false);
  });

  it('returns false when signature header is missing', () => {
    expect(
      validateTwilioSignature({}, body, url, authToken)
    ).toBe(false);
  });
});
