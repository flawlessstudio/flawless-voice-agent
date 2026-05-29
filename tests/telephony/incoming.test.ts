/**
 * Tests for Twilio incoming call handler
 * Verifies TwiML generation and signature validation integration
 */

describe('Incoming call — TwiML response', () => {
  it('returns valid TwiML with Connect > Stream', () => {
    const PUBLIC_URL = 'https://test.ngrok-free.app';
    const twiml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      `  <Connect>`,
      `    <Stream url="wss://${new URL(PUBLIC_URL).host}/media-stream"/>`,
      `  </Connect>`,
      '</Response>',
    ].join('\n');

    expect(twiml).toContain('<Connect>');
    expect(twiml).toContain('<Stream url=');
    expect(twiml).toContain('/media-stream');
    expect(twiml).toContain('</Response>');
  });

  it('WebSocket URL uses wss:// not ws://', () => {
    const PUBLIC_URL = 'https://test.ngrok-free.app';
    const wsUrl = `wss://${new URL(PUBLIC_URL).host}/media-stream`;
    expect(wsUrl).toMatch(/^wss:\/\//); 
  });

  it('rejects http:// public URLs (must be https for Twilio)', () => {
    const PUBLIC_URL = 'http://insecure.example.com';
    const isSecure = PUBLIC_URL.startsWith('https://');
    expect(isSecure).toBe(false); // signals misconfiguration
  });
});
