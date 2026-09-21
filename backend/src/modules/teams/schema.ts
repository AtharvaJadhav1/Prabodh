import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(2).max(120),
  institute: z.string().min(2).max(200),
  theme: z.string().max(120).optional(),
  memberCap: z.number().int().min(2).max(10).optional(),
});

export const patchTeamSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  theme: z.string().max(120).optional(),
  institute: z.string().min(2).max(200).optional(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
});

export const assignIndustrialMentorSchema = z
  .object({
    industrialMentorId: z.string().uuid().optional(),
    industrial_mentor_id: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
  })
  .refine((b) => Boolean(b.industrialMentorId || b.industrial_mentor_id || b.userId), {
    message: 'Provide "industrialMentorId", "industrial_mentor_id" or "userId"',
  });
