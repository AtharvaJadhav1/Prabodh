import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

function resolveTurnstileSecret(): string | null {
  const envVal = process.env.TURNSTILE_SECRET_KEY?.trim().replace(/^["']|["']$/g, '');
  return envVal || null;
}

@Injectable()
export class CaptchaService {
  private readonly verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  constructor() {
    const key = resolveTurnstileSecret();
    if (!key && process.env.NODE_ENV === 'production') {
      console.warn('[captcha] TURNSTILE_SECRET_KEY not set — CAPTCHA validation will fail in production');
    }
  }

  async verifyDetails(token: string, ip?: string): Promise<{ success: boolean; errors?: string[] }> {
    if (!token) return { success: false, errors: ['missing-input-response'] };

    const secretKey = resolveTurnstileSecret();
    if (!secretKey) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[captcha] No secret key configured — allowing request (dev mode)');
        return { success: true };
      }
      return { success: false, errors: ['missing-input-secret'] };
    }

    try {
      const payload: Record<string, string> = {
        secret: secretKey,
        response: token,
      };
      if (ip && process.env.TURNSTILE_STRICT_IP === 'true') {
        payload.remoteip = ip;
      }

      const response = await fetch(this.verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json() as {
        success: boolean;
        'error-codes'?: string[];
        challenge_ts?: string;
        hostname?: string;
        action?: string;
        cdata?: string;
      };

      if (!result.success) {
        console.error('[captcha] Verification failed', { errors: result['error-codes'] });

        const isServerConfigError = result['error-codes']?.some(
          (code) => code === 'invalid-input-secret' || code === 'missing-input-secret',
        );
        if (isServerConfigError) {
          console.error(
            '[captcha] CRITICAL: Cloudflare reported invalid-input-secret or missing-input-secret. Update TURNSTILE_SECRET_KEY in server configuration immediately.',
          );
        }

        return { success: false, errors: result['error-codes'] };
      }

      return { success: true };
    } catch (err) {
      console.error('[captcha] Verification request failed', err);
      // Fail closed in production, fail open in dev
      return { success: process.env.NODE_ENV !== 'production', errors: ['network-error'] };
    }
  }

  async verify(token: string, ip?: string): Promise<boolean> {
    const res = await this.verifyDetails(token, ip);
    return res.success;
  }

  /** Throw a 403 if token is missing or invalid */
  async verifyOrThrow(token: string | undefined, ip?: string): Promise<void> {
    if (!token) {
      throw new HttpException('CAPTCHA token required', HttpStatus.FORBIDDEN);
    }
    const check = await this.verifyDetails(token, ip);
    if (!check.success) {
      const errorMsg = check.errors?.length ? ` (${check.errors.join(', ')})` : '';
      throw new HttpException(`Invalid CAPTCHA token${errorMsg}`, HttpStatus.FORBIDDEN);
    }
  }
}

/** Standalone function for non-Nest contexts (e.g., middleware) */
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secretKey = resolveTurnstileSecret();
  if (!secretKey) {
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
  }

  try {
    const payload: Record<string, string> = {
      secret: secretKey,
      response: token,
    };
    if (ip && process.env.TURNSTILE_STRICT_IP === 'true') {
      payload.remoteip = ip;
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json() as { success: boolean; 'error-codes'?: string[] };
    if (!result.success) {
      console.error('[captcha] Verification failed', { errors: result['error-codes'] });
      const isServerConfigError = result['error-codes']?.some(
        (code) => code === 'invalid-input-secret' || code === 'missing-input-secret',
      );
      if (isServerConfigError) {
        console.error(
          '[captcha] CRITICAL: Cloudflare reported invalid/missing secret key in verifyTurnstileToken.',
        );
      }
      return false;
    }
    return result.success === true;
  } catch {
    return process.env.NODE_ENV !== 'production';
  }
}