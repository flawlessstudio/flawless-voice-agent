import { logger } from '../analytics/logger.js';

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  open: boolean;
}

const state: Record<string, CircuitBreakerState> = {};

const THRESHOLD = 5;
const RESET_MS = 60_000;

export function isOpen(key: string): boolean {
  const s = state[key];
  if (!s) return false;
  if (s.open && Date.now() - s.lastFailure > RESET_MS) {
    logger.info({ key }, 'Circuit breaker reset');
    state[key] = { failures: 0, lastFailure: 0, open: false };
    return false;
  }
  return s.open;
}

export function recordFailure(key: string): void {
  if (!state[key]) state[key] = { failures: 0, lastFailure: 0, open: false };
  state[key].failures++;
  state[key].lastFailure = Date.now();
  if (state[key].failures >= THRESHOLD) {
    state[key].open = true;
    logger.warn({ key }, 'Circuit breaker opened');
  }
}

export function recordSuccess(key: string): void {
  if (state[key]) state[key].failures = 0;
}
