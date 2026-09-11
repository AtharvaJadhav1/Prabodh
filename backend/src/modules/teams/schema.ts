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
