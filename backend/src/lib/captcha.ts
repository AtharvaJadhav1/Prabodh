import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class CaptchaService {
  private readonly secretKey: string;
  private readonly verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  constructor() {
    this.secretKey = process.env.TURNSTILE_SECRET_KEY ?? '';
    if (!this.secretKey && process.env.NODE_ENV === 'production') {
      console.warn('[captcha] TURNSTILE_SECRET_KEY not set — CAPTCHA validation will fail in production');
    }
  }

  async verify(token: string, ip?: string): Promise<boolean> {
    if (!token) return false;
    if (!this.secretKey) {
      // In development without secret, allow but warn
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[captcha] No secret key configured — allowing request (dev mode)');
        return true;
      }
      return false;
    }

    try {
      const formData = new FormData();
      formData.append('secret', this.secretKey);
      formData.append('response', token);
      if (ip) formData.append('remoteip', ip);

      const response = await fetch(this.verifyUrl, {
        method: 'POST',
        body: formData,
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
        console.warn('[captcha] Verification failed', { errors: result['error-codes'] });
        return false;
      }

      // Optional: verify action matches expected (e.g., 'login', 'register')
      // Optional: verify hostname matches your domain

      return true;
    } catch (err) {
      console.error('[captcha] Verification request failed', err);
      // Fail closed in production, fail open in dev
      return process.env.NODE_ENV !== 'production';
    }
  }

  /** Throw a 403 if token is missing or invalid */
  async verifyOrThrow(token: string | undefined, ip?: string): Promise<void> {
    if (!token) {
      throw new HttpException('CAPTCHA token required', HttpStatus.FORBIDDEN);
    }
    const valid = await this.verify(token, ip);
    if (!valid) {
      throw new HttpException('Invalid CAPTCHA token', HttpStatus.FORBIDDEN);
    }
  }
}

/** Standalone function for non-Nest contexts (e.g., middleware) */
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY ?? '';
  if (!secretKey) {
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json() as { success: boolean; 'error-codes'?: string[] };
    return result.success === true;
  } catch {
    return process.env.NODE_ENV !== 'production';
  }
}