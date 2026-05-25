/**
 * E2E tests for the core call flow
 * These tests spin up the express app and simulate Twilio webhooks
 */
import request from 'supertest';
import { createApp } from '../../src/api/app';

const app = createApp();

describe('E2E: Call flow', () => {
  describe('GET /health', () => {
    it('returns 200 ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /twilio/incoming', () => {
    it('returns TwiML on valid incoming call', async () => {
      const res = await request(app)
        .post('/twilio/incoming')
        .send('CallSid=CA1234567890abcdef&From=%2B15551234567&CallStatus=ringing')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(res.status).toBe(200);
      expect(res.type).toMatch(/xml/);
      expect(res.text).toContain('<Response>');
    });
  });

  describe('POST /twilio/status', () => {
    it('returns 200 on status callback', async () => {
      const res = await request(app)
        .post('/twilio/status')
        .send('CallSid=CA1234567890abcdef&CallStatus=completed')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /twilio/gather', () => {
    it('returns TwiML on gather result', async () => {
      const res = await request(app)
        .post('/twilio/gather')
        .send('CallSid=CA1234567890abcdef&SpeechResult=Yes+I+am+interested')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(res.status).toBe(200);
      expect(res.text).toContain('<Response>');
    });
  });
});
