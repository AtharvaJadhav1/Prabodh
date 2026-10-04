import { z } from 'zod';
import { CATEGORY_ACTIONS } from '../../lib/audit-view';

export const allocateSchema = z.object({
  teamId: z.string().uuid(),
  mentorUserId: z.string().uuid(),
  mentorType: z.enum(['institute', 'industry']),
  assignmentMethod: z.enum(['manual', 'auto_rule']).default('manual'),
});

export const assignInstituteMentorSchema = z.object({
  teamId: z.string().uuid(),
  mentorUserId: z.string().uuid(),
});

export const autoAllocateSchema = z.object({
  mentorType: z.enum(['institute', 'industry']),
});

export const mentorInviteSchema = z.object({
  teamId: z.string().uuid(),
  email: z.string().email(),
  mentorType: z.enum(['institute', 'industry']).default('institute'),
});

export const reassignSchema = z.object({ mentorUserId: z.string().uuid() });

export const MAX_AUDIT_HOURS = 24 * 90;

/** Query for GET /mentors/me/audit-log. Invalid values are a 400, never a 500. */
export const auditLogQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().max(200).optional(),
  teamId: z.string().uuid().optional(),
  mentorType: z.string().optional(),
  category: z
    .string()
    .refine((c) => Object.prototype.hasOwnProperty.call(CATEGORY_ACTIONS, c), { message: 'Unknown audit category' })
    .optional(),
  hours: z
    .string()
    .regex(/^\d+$/, 'hours must be a positive integer')
    .transform(Number)
    .refine((n) => n >= 1 && n <= MAX_AUDIT_HOURS, { message: `hours must be between 1 and ${MAX_AUDIT_HOURS}` })
    .optional(),
});
