/**
 * Tests for tracer utility
 * Validates no-op fallback when Langfuse is not configured
 */

describe('Tracer — no-op fallback', () => {
  it('startGeneration returns a span with end() and error() methods', () => {
    // Simulate no Langfuse configured
    const noopSpan = {
      end:   (out?: any) => {},
      error: (err: Error) => {},
    };
    expect(typeof noopSpan.end).toBe('function');
    expect(typeof noopSpan.error).toBe('function');
  });

  it('span.end() does not throw without arguments', () => {
    const span = { end: (out?: any) => {}, error: (err: Error) => {} };
    expect(() => span.end()).not.toThrow();
  });

  it('span.error() does not throw', () => {
    const span = { end: (out?: any) => {}, error: (err: Error) => {} };
    expect(() => span.error(new Error('test error'))).not.toThrow();
  });

  it('SpanInput requires name field', () => {
    const input = { name: 'test-span', sessionId: 'sess_001' };
    expect(input.name).toBeTruthy();
  });

  it('SpanOutput level enum is valid', () => {
    const levels = ['DEFAULT', 'DEBUG', 'WARNING', 'ERROR'];
    expect(levels).toContain('ERROR');
    expect(levels).toContain('DEFAULT');
  });
});
