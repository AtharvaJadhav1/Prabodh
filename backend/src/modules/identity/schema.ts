import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(120),
  institute: z.string().min(2).max(200).optional(),
  department: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  /** CAPTCHA token from Cloudflare Turnstile (invisible) */
  captchaToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
  /** Optional — when omitted, any role may sign in and the client routes by platformRole. */
  portal: z.enum(['student', 'faculty']).optional(),
  /** CAPTCHA token from Cloudflare Turnstile (invisible) */
  captchaToken: z.string().optional(),
});

export const otpSendSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['login', 'register']),
  accountType: z.enum(['student', 'faculty', 'industry']).optional(),
  password: z.string().min(8).max(128).optional(),
  fullName: z.string().min(2).max(120).optional(),
  institute: z.string().min(2).max(200).optional(),
  department: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  /** CAPTCHA token from Cloudflare Turnstile (invisible) */
  captchaToken: z.string().optional(),
});

export const otpVerifySchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['login', 'register']),
  code: z.string().regex(/^\d{6}$/),
  portal: z.enum(['student', 'faculty']).optional(),
});

export const passwordForgotSchema = z.object({
  email: z.string().email(),
  /** CAPTCHA token from Cloudflare Turnstile (invisible) */
  captchaToken: z.string().optional(),
});

export const passwordVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  /** CAPTCHA token from Cloudflare Turnstile (invisible) */
  captchaToken: z.string().optional(),
});

export const passwordResetSchema = z.object({
  email: z.string().email(),
  resetToken: z.string().min(16).max(128),
  password: z.string().min(8).max(128),
  /** CAPTCHA token from Cloudflare Turnstile (invisible) */
  captchaToken: z.string().optional(),
});

/**
 * Public LinkedIn profile link. A bare host ("linkedin.com/in/x") gets an https
 * scheme so the stored value is always a safe link target; anything that is not
 * http(s) once normalized (e.g. "javascript:") is rejected. "" clears the link,
 * while omitting the key entirely leaves the stored value untouched.
 */
const linkedinUrlSchema = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (!v) return null;
    return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v.replace(/^\/\//, '')}`;
  })
  .refine((v) => v === undefined || v === null || /^https?:\/\//i.test(v), {
    message: 'LinkedIn URL must be an http(s) link',
  });

export const patchMeSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().max(30).optional(),
  department: z.string().max(120).optional(),
  institute: z.string().max(200).optional(),
  linkedinUrl: linkedinUrlSchema,
  profileJson: z.record(z.unknown()).optional(),
});

export const avatarUploadSchema = z.object({
  filename: z.string().min(1).max(240),
  contentType: z.string().min(1).max(120),
  dataBase64: z.string().min(1, 'Image data is required'),
});

export const switchRoleSchema = z.object({
  role: z.enum(['student', 'institute_mentor', 'industry_mentor', 'admin', 'student_expert']),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});
