import { redactPII } from '../../src/compliance/pii';

describe('redactPII', () => {
  it('redacts phone numbers', () => {
    expect(redactPII('Call me at 555-123-4567')).toBe('Call me at [REDACTED]');
  });

  it('redacts email addresses', () => {
    expect(redactPII('Email me at test@example.com')).toBe('Email me at [REDACTED]');
  });

  it('passes clean text unchanged', () => {
    expect(redactPII('Hello, how are you?')).toBe('Hello, how are you?');
  });
});
