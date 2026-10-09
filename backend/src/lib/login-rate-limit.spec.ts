import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAX_FAILED_ATTEMPTS,
  DEFAULT_WINDOW_MINUTES,
  DEFAULT_BLOCK_DURATION_HOURS,
  DEFAULT_MAX_LOCKOUTS_BEFORE_BLOCK,
} from './login-rate-limit';

describe('login rate limit defaults', () => {
  test('constants have sensible security values', () => {
    assert.equal(DEFAULT_MAX_FAILED_ATTEMPTS, 5);
    assert.equal(DEFAULT_WINDOW_MINUTES, 15);
    assert.equal(DEFAULT_BLOCK_DURATION_HOURS, 24);
    assert.equal(DEFAULT_MAX_LOCKOUTS_BEFORE_BLOCK, 3);
  });
});
