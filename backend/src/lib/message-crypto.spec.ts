import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'crypto';
import {
  UNREADABLE_MESSAGE,
  decryptText,
  dmAad,
  encryptText,
  isEncrypted,
  loadKeyRing,
  parseKey,
} from './message-crypto';

const keyA = randomBytes(32).toString('base64');
const keyB = randomBytes(32).toString('hex');
const ringA = loadKeyRing({ CHAT_ENCRYPTION_KEY: keyA });
const aad = dmAad('u1:u2', 'u1');

describe('message encryption', () => {
  it('round-trips text, including emoji and multi-line', () => {
    const text = 'Hello 👋\nsecond line — ünïcode';
    const stored = encryptText(text, aad, ringA);
    assert.equal(isEncrypted(stored), true);
    assert.equal(stored.includes('Hello'), false, 'plain text must not appear in the stored value');
    assert.equal(decryptText(stored, aad, ringA), text);
  });

  it('produces a different ciphertext every time (random IV)', () => {
    assert.notEqual(encryptText('same', aad, ringA), encryptText('same', aad, ringA));
  });

  it('refuses to decrypt in another conversation or as another sender', () => {
    const stored = encryptText('private', aad, ringA);
    assert.equal(decryptText(stored, dmAad('u1:u3', 'u1'), ringA), UNREADABLE_MESSAGE);
    assert.equal(decryptText(stored, dmAad('u1:u2', 'u2'), ringA), UNREADABLE_MESSAGE);
  });

  it('detects tampering', () => {
    const stored = encryptText('private', aad, ringA);
    const parts = stored.split(':');
    const last = parts[parts.length - 1];
    parts[parts.length - 1] = (last[0] === 'A' ? 'B' : 'A') + last.slice(1);
    assert.equal(decryptText(parts.join(':'), aad, ringA), UNREADABLE_MESSAGE);
  });

  it('cannot be read with a different key', () => {
    const stored = encryptText('private', aad, ringA);
    const other = loadKeyRing({ CHAT_ENCRYPTION_KEY: keyB });
    assert.equal(decryptText(stored, aad, other), UNREADABLE_MESSAGE);
  });
});

describe('legacy and unconfigured behaviour', () => {
  it('returns legacy plain-text messages unchanged', () => {
    assert.equal(decryptText('hello from before encryption', aad, ringA), 'hello from before encryption');
  });

  it('stores plain text when no key is configured (so a missing setting never breaks sending)', () => {
    const none = loadKeyRing({});
    assert.equal(encryptText('hi', aad, none), 'hi');
    assert.equal(decryptText('hi', aad, none), 'hi');
  });

  it('rejects a malformed key instead of silently running unencrypted', () => {
    assert.throws(() => loadKeyRing({ CHAT_ENCRYPTION_KEY: 'too-short' }));
    assert.throws(() => parseKey(randomBytes(16).toString('hex')));
  });
});

describe('key rotation', () => {
  it('still reads old messages after the key changes, and writes new ones with the new key', () => {
    const oldStored = encryptText('written with the old key', aad, ringA);
    const rotated = loadKeyRing({ CHAT_ENCRYPTION_KEY: keyB, CHAT_ENCRYPTION_KEY_OLD: keyA });
    assert.equal(decryptText(oldStored, aad, rotated), 'written with the old key');
    const fresh = encryptText('new message', aad, rotated);
    assert.equal(decryptText(fresh, aad, rotated), 'new message');
    // the old-only ring cannot read messages written after rotation
    assert.equal(decryptText(fresh, aad, ringA), UNREADABLE_MESSAGE);
  });

  it('accepts both hex and base64 keys', () => {
    assert.equal(parseKey(keyA).length, 32);
    assert.equal(parseKey(keyB).length, 32);
  });
});
