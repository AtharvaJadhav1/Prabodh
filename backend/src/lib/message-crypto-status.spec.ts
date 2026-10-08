import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'crypto';
import { isEncryptionAtRestActive } from './message-crypto-status';

describe('isEncryptionAtRestActive', () => {
  it('is true with a valid current key', () => {
    assert.equal(isEncryptionAtRestActive({ CHAT_ENCRYPTION_KEY: randomBytes(32).toString('hex') }), true);
  });
  it('is false when no key is set or it is blank', () => {
    assert.equal(isEncryptionAtRestActive({}), false);
    assert.equal(isEncryptionAtRestActive({ CHAT_ENCRYPTION_KEY: '   ' }), false);
  });
  it('is false when only an old (read-only) key exists', () => {
    assert.equal(isEncryptionAtRestActive({ CHAT_ENCRYPTION_KEY_OLD: randomBytes(32).toString('hex') }), false);
  });
  it('is false for a malformed key instead of throwing', () => {
    assert.equal(isEncryptionAtRestActive({ CHAT_ENCRYPTION_KEY: 'nope' }), false);
  });
});
