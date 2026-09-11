import { z } from 'zod';

export const clerkUserWebhookSchema = z.object({
  type: z.string(),
  data: z.record(z.unknown()),
});

export const registerSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  institute: z.string().min(2).max(200).optional(),
  department: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
});

export const otpSendSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['login', 'register']),
  fullName: z.string().min(2).max(120).optional(),
  institute: z.string().min(2).max(200).optional(),
  department: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
});

export const otpVerifySchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['login', 'register']),
  code: z.string().regex(/^\d{6}$/),
});
