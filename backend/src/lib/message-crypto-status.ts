import { loadKeyRing } from './message-crypto';

/**
 * True when new direct messages are encrypted at rest (a current CHAT_ENCRYPTION_KEY is configured and valid).
 * A malformed key counts as "not active": writes fail closed elsewhere, and the UI must never claim more than is true.
 */
export function isEncryptionAtRestActive(env: Record<string, string | undefined> = process.env): boolean {
  try {
    return Boolean(loadKeyRing(env).current);
  } catch {
    return false;
  }
}
