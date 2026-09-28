import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateStaffPassword, STAFF_PASSWORD_CHARSET, STAFF_PASSWORD_LENGTH } from './staff-password';

describe('staff password generation', () => {
  it('renders two blocks of random alphanumerics with a separating hyphen', () => {
    const password = generateStaffPassword();
    assert.match(password, /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/);
  });

  it('draws every character from the safe charset', () => {
    for (let i = 0; i < 200; i++) {
      for (const ch of generateStaffPassword().replace('-', '')) {
        assert.ok(STAFF_PASSWORD_CHARSET.includes(ch));
      }
    }
  });

  it('always contains at least one letter and one digit', () => {
    for (let i = 0; i < 200; i++) {
      const raw = generateStaffPassword();
      assert.match(raw, /[a-zA-Z]/);
      assert.match(raw, /[0-9]/);
    }
  });

  it('uses the configured length before hyphen grouping', () => {
    const raw = generateStaffPassword();
    assert.equal(raw.replace('-', '').length, STAFF_PASSWORD_LENGTH);
  });

  it('is not deterministic', () => {
    const a = generateStaffPassword();
    const b = generateStaffPassword();
    assert.notEqual(a, b);
  });

  it('produces distinct values across many draws', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateStaffPassword());
    assert.ok(seen.size > 950, `expected high uniqueness, got ${seen.size}/1000`);
  });
});