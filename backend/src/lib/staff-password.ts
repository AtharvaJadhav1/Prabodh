import { randomInt } from 'crypto';

/**
 * Unambiguous alphanumerics — no 0/O, 1/l/I — so people do not transcribe the
 * password wrong from the credentials email.
 */
export const STAFF_PASSWORD_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export const STAFF_PASSWORD_LENGTH = 8;

function sampleCharset(size: number): string {
  let out = '';
  for (let i = 0; i < size; i++) {
    out += STAFF_PASSWORD_CHARSET[randomInt(STAFF_PASSWORD_CHARSET.length)];
  }
  return out;
}

function hasLetter(s: string): boolean {
  return /[a-zA-Z]/.test(s);
}

function hasDigit(s: string): boolean {
  return /[0-9]/.test(s);
}

export function generateStaffPassword(): string {
  if (STAFF_PASSWORD_LENGTH < 2) {
    throw new Error('STAFF_PASSWORD_LENGTH must be at least 2');
  }
  let raw = sampleCharset(STAFF_PASSWORD_LENGTH);
  // Avoid all-letter / all-digit accidents while keeping ~47 bits of entropy.
  let guards = 0;
  while ((!hasLetter(raw) || !hasDigit(raw)) && guards < 64) {
    raw = sampleCharset(STAFF_PASSWORD_LENGTH);
    guards += 1;
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}