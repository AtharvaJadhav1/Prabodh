import { z } from 'zod';

export const createIdeaSchema = z.object({
  teamId: z.string().uuid(),
  psId: z.string().uuid(),
  abstract: z.string().min(20),
  techStack: z.string().min(2),
  feasibilityNotes: z.string().min(10),
});

export const patchIdeaSchema = z.object({
  psId: z.string().uuid().optional(),
  abstract: z.string().min(20).optional(),
  techStack: z.string().min(2).optional(),
  feasibilityNotes: z.string().min(10).optional(),
});

export const createPsSchema = z.object({
  code: z.string().min(3),
  title: z.string().min(5),
  theme: z.string().min(2),
  category: z.enum(['software', 'hardware']),
  organisation: z.string().min(2),
  description: z.string().min(10),
  teamCap: z.number().int().positive().optional(),
});

export const patchPsSchema = createPsSchema.partial();

export const manualIdeaSchema = z.object({
  teamId: z.string().uuid(),
  title: z.string().min(5),
  theme: z.string().min(2),
  category: z.enum(['software', 'hardware']),
  organisation: z.string().min(2).default('Student Innovation'),
  description: z.string().min(10),
  abstract: z.string().min(20),
  techStack: z.string().min(2),
  feasibilityNotes: z.string().min(10),
});
