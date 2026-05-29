import crypto from 'crypto';
import { verifyRetellSignature, routeRetellEvent } from '../../src/orchestration/retell.js';
import type { RetellWebhookEvent } from '../../src/orchestration/retell.js';

describe('verifyRetellSignature', () => {
  const apiKey = 'retell_test_key';

  beforeEach(() => { process.env.RETELL_API_KEY = apiKey; });
  afterEach(() => { delete process.env.RETELL_API_KEY; });

  it('returns true for valid HMAC-SHA256 signature', () => {
    const body = JSON.stringify({ event: 'call_started', call_id: 'abc123' });
    const sig = crypto.createHmac('sha256', apiKey).update(body).digest('hex');
    expect(verifyRetellSignature(body, sig)).toBe(true);
  });

  it('returns false for tampered body', () => {
    const body = JSON.stringify({ event: 'call_started', call_id: 'abc123' });
    const sig = crypto.createHmac('sha256', apiKey).update(body).digest('hex');
    expect(verifyRetellSignature(body + 'tampered', sig)).toBe(false);
  });

  it('returns false for wrong key', () => {
    const body = JSON.stringify({ event: 'call_started', call_id: 'abc123' });
    const sig = crypto.createHmac('sha256', 'wrong_key').update(body).digest('hex');
    expect(verifyRetellSignature(body, sig)).toBe(false);
  });
});

describe('routeRetellEvent', () => {
  it('calls onCallStarted for call_started event', () => {
    const onCallStarted = jest.fn();
    const event: RetellWebhookEvent = { event: 'call_started', call_id: 'abc123' };
    routeRetellEvent(event, { onCallStarted });
    expect(onCallStarted).toHaveBeenCalledWith('abc123');
  });

  it('calls onCallEnded with duration for call_ended event', () => {
    const onCallEnded = jest.fn();
    const event: RetellWebhookEvent = {
      event: 'call_ended',
      call_id: 'abc123',
      call: {
        call_id: 'abc123',
        call_status: 'ended',
        duration_ms: 45000,
        from_number: '+34600000000',
        to_number: '+34611111111',
      },
    };
    routeRetellEvent(event, { onCallEnded });
    expect(onCallEnded).toHaveBeenCalledWith('abc123', 45000);
  });

  it('calls onCallAnalyzed for call_analyzed event', () => {
    const onCallAnalyzed = jest.fn();
    const event: RetellWebhookEvent = {
      event: 'call_analyzed',
      call_id: 'abc123',
      call: {
        call_id: 'abc123',
        call_status: 'ended',
        from_number: '+34600000000',
        to_number: '+34611111111',
        call_analysis: { call_summary: 'Good call', call_successful: true },
      },
    };
    routeRetellEvent(event, { onCallAnalyzed });
    expect(onCallAnalyzed).toHaveBeenCalledWith('abc123', event.call);
  });
});
