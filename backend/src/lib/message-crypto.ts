import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * Application-level encryption for private chat messages (AES-256-GCM).
 *
 * Why: database dumps, backups, or anyone with read access to the database should not be able to read
 * people's private messages. The key lives in the app's settings (`CHAT_ENCRYPTION_KEY`), never in the
 * database. Messages are still readable by the server itself, so this is encryption at rest, not
 * end-to-end encryption (the server must be able to show history, previews and unread counts).
 *
 * Stored format:  enc:v1:<keyId>:<iv>:<authTag>:<ciphertext>   (all base64url)
 *  - keyId   first 8 hex chars of SHA-256(key): lets old messages be read after a key rotation.
 *  - AAD     binds each ciphertext to its conversation + sender, so a stored message copied into
 *            another conversation (or attributed to another sender) fails authentication.
 *  - Values without the `enc:v1:` prefix are legacy plain text and are returned unchanged, so turning
 *    encryption on never breaks existing messages.
 */

const PREFIX = 'enc:v1:';
export const UNREADABLE_MESSAGE = '[message unavailable]';

export type KeyRing = {
  /** Key used for new messages; undefined means encryption is not configured (messages stay plain). */
  current?: { id: string; key: Buffer };
  /** Every key that may have encrypted a stored message (current + old rotated-out keys). */
  byId: Map<string, Buffer>;
};

function keyId(key: Buffer): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 8);
}

/** Accepts 64 hex chars or base64 that decodes to exactly 32 bytes. Throws on anything else. */
export function parseKey(raw: string): Buffer {
  const v = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(v)) return Buffer.from(v, 'hex');
  const b = Buffer.from(v, 'base64');
  if (b.length === 32) return b;
  throw new Error('CHAT_ENCRYPTION_KEY must be 32 bytes: 64 hex characters or a 44-character base64 string.');
}

export function loadKeyRing(env: Record<string, string | undefined> = process.env): KeyRing {
  const byId = new Map<string, Buffer>();
  let current: KeyRing['current'];
  if (env.CHAT_ENCRYPTION_KEY?.trim()) {
    const key = parseKey(env.CHAT_ENCRYPTION_KEY);
    current = { id: keyId(key), key };
    byId.set(current.id, key);
  }
  // Old keys (comma separated) stay valid for READING after a rotation.
  for (const raw of (env.CHAT_ENCRYPTION_KEY_OLD ?? '').split(',')) {
    if (!raw.trim()) continue;
    const key = parseKey(raw);
    byId.set(keyId(key), key);
  }
  return { current, byId };
}

let cachedRing: KeyRing | null = null;
let ringError: Error | null = null;
let warnedNoKey = false;

function defaultRing(): KeyRing {
  if (!cachedRing) {
    try {
      cachedRing = loadKeyRing();
    } catch (err) {
      // A malformed key in the settings must not take the whole chat down: reading plain/legacy
      // messages keeps working; writing fails closed (see encryptText) instead of silently storing plain text.
      ringError = err instanceof Error ? err : new Error(String(err));
      console.error('[chat] encryption key is misconfigured:', ringError.message);
      cachedRing = { current: undefined, byId: new Map() };
    }
  }
  return cachedRing;
}

/** Test helper: forget the cached key ring so the next call re-reads the environment. */
export function resetKeyRingCache() {
  cachedRing = null;
  ringError = null;
  warnedNoKey = false;
}

export function isEncrypted(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

/** Context that a ciphertext is bound to (conversation + sender of a direct message). */
export function dmAad(pairKey: string, senderId: string): string {
  return `dm|${pairKey}|${senderId}`;
}

export function encryptText(plain: string, aad: string, ring: KeyRing = defaultRing()): string {
  if (ringError && ring === cachedRing) throw ringError;
  if (!ring.current) {
    if (!warnedNoKey) {
      warnedNoKey = true;
      console.warn('[chat] CHAT_ENCRYPTION_KEY is not set — new messages are stored unencrypted.');
    }
    return plain;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ring.current.key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${ring.current.id}:${iv.toString('base64url')}:${tag.toString('base64url')}:${ct.toString('base64url')}`;
}

export function decryptText(stored: string, aad: string, ring: KeyRing = defaultRing()): string {
  if (!isEncrypted(stored)) return stored; // legacy plain text
  try {
    const [kid, ivB64, tagB64, ctB64] = stored.slice(PREFIX.length).split(':');
    const key = ring.byId.get(kid);
    if (!key || !ivB64 || !tagB64 || ctB64 === undefined) throw new Error('unknown key or malformed value');
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    // Wrong key, tampered data, or a message moved to another conversation. Never crash the chat.
    console.error('[chat] could not decrypt a stored message (wrong key or altered data).');
    return UNREADABLE_MESSAGE;
  }
}
