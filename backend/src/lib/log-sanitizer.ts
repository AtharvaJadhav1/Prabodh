/**
 * Log Sanitizer Utility
 * 
 * Automatically masks/redacts sensitive fields from log data before they are written
 * to console or files. Prevents PII, passwords, OTPs, and tokens from appearing in plain text.
 * 
 * Usage:
 *   const sanitized = sanitizeLogData({ password: 'secret', email: 'user@example.com', name: 'John' });
 *   // Returns: { password: '****MASKED****', email: 'us***@example.com', name: 'John' }
 */

const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'newPassword',
  'currentPassword',
  'confirmPassword',
  'otp',
  'code',
  'resetToken',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
]);

const PARTIAL_MASK_EMAIL = /^[a-zA-Z0-9._%+-]+([^@]*)?@/;

/**
 * Deeply sanitize an object/array, masking sensitive fields.
 * 
 * @param data - The data to sanitize (object, array, or primitive)
 * @returns Sanitized data with sensitive fields masked
 */
export function sanitizeLogData(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  if (typeof data !== 'object') return data;

  const object = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(object)) {
    const lowerKey = key.toLowerCase();

    // Check if this is a sensitive field name
    if (SENSITIVE_FIELDS.has(lowerKey)) {
      sanitized[key] = '****MASKED****';
      continue;
    }

    // Partial email masking: us***@example.com
    if (lowerKey === 'email' && typeof value === 'string') {
      sanitized[key] = partialMaskEmail(value);
      continue;
    }

    // Recursively sanitize nested objects
    sanitized[key] = sanitizeLogData(value);
  }

  return sanitized;
}

/** Partially mask an email address, showing only the first 2 chars of the local part */
function partialMaskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '***MASKED***';

  const match = email.match(PARTIAL_MASK_EMAIL);
  if (match) {
    const localPart = match[1] || '';
    const maskedLocal = localPart.slice(0, 2).padEnd(localPart.length, '*');
    return `${maskedLocal}@${email.slice(email.indexOf('@') + 1)}`;
  }

  return '***MASKED***';
}

/** Mask a string value if it contains sensitive data */
export function logSafe(data: unknown): unknown {
  return sanitizeLogData(data);
}

export function maskString(value: string): string {
  if (!value || typeof value !== 'string') return value;

  const lower = value.toLowerCase();

  // Check for common sensitive patterns
  const sensitivePatterns = [
    /password['"]?\s*:['"]?(.*?)(?=[,}\s])/i,
    /otp['"]?\s*:['"]?(.*?)(?=[,}\s])/i,
    /token['"]?\s*:['"]?(.*?)(?=[,}\s])/i,
    /secret['"]?\s*:['"]?(.*?)(?=[,}\s])/i,
    /api_key['"]?\s*:['"]?(.*?)(?=[,}\s])/i,
  ];

  let result = value;
  for (const pattern of sensitivePatterns) {
    result = result.replace(pattern, (match, captured) => {
      if (captured) {
        return match.replace(captured, '****MASKED****');
      }
      return '****MASKED****';
    });
  }

  return result;
}