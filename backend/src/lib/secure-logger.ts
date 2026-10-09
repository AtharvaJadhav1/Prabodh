import { Logger as NestLogger } from '@nestjs/common';
import { sanitizeLogData } from './log-sanitizer';

/**
 * SecureLogger - A wrapper around NestJS Logger that automatically sanitizes
 * all logged data to prevent PII, passwords, OTPs, and tokens from appearing
 * in plain text in logs.
 * 
 * Usage in services:
 *   const logger = new SecureLogger(SomeService.name);
 *   logger.log(sanitizeLogData({ user: 'john', password: 'secret123' }));
 *   // Logs: { user: 'john', password: '****MASKED****' }
 * 
 * Or simply wrap any data before logging:
 *   logger.error('Request failed', { requestId, user: sanitizeLogData(userData) });
 */
export class SecureLogger {
  private readonly nestLogger: NestLogger;
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
    this.nestLogger = new NestLogger(name);
  }

  /** Log at 'log' level (development) or 'warn' level (production) */
  log(message: unknown, ...optionalParams: unknown[]): void {
    const sanitized = sanitizeLogData(message);
    // In production, only log errors and warnings by default
    // In development, log everything
    if (process.env.NODE_ENV === 'production') {
      this.nestLogger.warn(String(sanitized), ...optionalParams.map(sanitizeLogData));
    } else {
      this.nestLogger.log(String(sanitized), ...optionalParams.map(sanitizeLogData));
    }
  }

  /** Log at 'warn' level */
  warn(message: unknown, ...optionalParams: unknown[]): void {
    const sanitized = sanitizeLogData(message);
    this.nestLogger.warn(String(sanitized), ...optionalParams.map(sanitizeLogData));
  }

  /** Log at 'error' level */
  error(message: unknown, trace?: string, context?: string): void {
    const sanitized = sanitizeLogData(message);
    this.nestLogger.error(String(sanitized), trace, context);
  }

  /** Log at 'debug' level (NestJS default) */
  debug(message: unknown, ...optionalParams: unknown[]): void {
    const sanitized = sanitizeLogData(message);
    this.nestLogger.debug(String(sanitized), ...optionalParams.map(sanitizeLogData));
  }
}

/**
 * Pre-configured logger instance for common use cases.
 * 
 * Usage:
 *   import { secureLogger } from '../lib/secure-logger';
 *   secureLogger.log({ userId, password: user.password }); // password will be auto-masked
 */
export const secureLogger = new SecureLogger('SecureLogger');

/**
 * Helper function to quickly sanitize data before passing to any logger.
 * 
 * @param data - Data that may contain sensitive fields
 * @returns Sanitized data safe for logging
 */
export function logSafe(data: unknown): unknown {
  return sanitizeLogData(data);
}