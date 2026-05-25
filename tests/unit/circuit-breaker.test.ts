import { isOpen, recordFailure, recordSuccess } from '../../src/runtime/circuit-breaker';

describe('CircuitBreaker', () => {
  it('is closed by default', () => {
    expect(isOpen('test-service-1')).toBe(false);
  });

  it('opens after 5 failures', () => {
    for (let i = 0; i < 5; i++) recordFailure('test-service-2');
    expect(isOpen('test-service-2')).toBe(true);
  });

  it('resets success counter on recordSuccess', () => {
    recordSuccess('test-service-2');
    // Still open until reset window passes, but failures reset to 0
    expect(isOpen('test-service-2')).toBe(true); // still open within window
  });
});
