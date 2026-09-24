import { z } from 'zod';

export const adminInviteUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  platformRole: z.enum(['institute_mentor', 'industry_mentor', 'admin', 'student_expert']),
  institute: z.string().min(2).max(200).optional(),
  department: z.string().max(120).optional(),
});

export const exportSchema = z.object({
  format: z.enum(['xlsx', 'pdf']),
  dataset: z.enum(['teams', 'submissions', 'evaluations']),
});

export const settingsSchema = z.object({
  member_cap: z.number().int().min(2).max(12).optional(),
  institute_mentor_cap: z.number().int().min(0).max(3).optional(),
  industry_mentor_cap: z.number().int().min(0).max(3).optional(),
  invite_ttl_hours: z.number().int().min(1).max(720).optional(),
  draft_hold_hours: z.number().int().min(1).max(720).optional(),
});
