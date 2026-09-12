import { z } from 'zod';

export const clerkUserWebhookSchema = z.object({
  type: z.string(),
  data: z.record(z.unknown()),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(120),
  institute: z.string().min(2).max(200).optional(),
  department: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
  portal: z.enum(['student', 'faculty']),
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
});

export const facultyRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(2).max(120),
  institute: z.string().min(2).max(200).optional(),
  department: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  /** institute = institute_mentor, industry = industry_mentor */
  mentorKind: z.enum(['institute', 'industry']).default('institute'),
});

export const otpVerifySchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['login', 'register']),
  code: z.string().regex(/^\d{6}$/),
});

export const patchMeSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().max(30).optional(),
  department: z.string().max(120).optional(),
  institute: z.string().max(200).optional(),
  profileJson: z.record(z.unknown()).optional(),
});
