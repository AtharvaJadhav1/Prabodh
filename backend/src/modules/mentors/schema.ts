import { z } from 'zod';

export const allocateSchema = z.object({
  teamId: z.string().uuid(),
  mentorUserId: z.string().uuid(),
  mentorType: z.enum(['institute', 'industry']),
  assignmentMethod: z.enum(['manual', 'auto_rule']).default('manual'),
});

export const autoAllocateSchema = z.object({
  mentorType: z.enum(['institute', 'industry']),
});

export const mentorInviteSchema = z.object({
  teamId: z.string().uuid(),
  email: z.string().email(),
  mentorType: z.enum(['institute', 'industry']).optional(),
});
