import { redactPII } from '../../src/compliance/pii';
import { checkDNC, addToOptOut } from '../../src/compliance/dnc';

describe('Compliance', () => {
  describe('PII redaction', () => {
    it('redacts phone numbers', () => {
      expect(redactPII('My number is 555-123-4567')).toContain('[REDACTED]');
    });
    it('redacts emails', () => {
      expect(redactPII('Email: test@example.com')).toContain('[REDACTED]');
    });
  });

  describe('DNC check', () => {
    it('allows clean numbers', async () => {
      expect(await checkDNC('+15559990000')).toBe(true);
    });
    it('blocks opted-out numbers', async () => {
      addToOptOut('+15550000001');
      expect(await checkDNC('+15550000001')).toBe(false);
    });
  });
});
