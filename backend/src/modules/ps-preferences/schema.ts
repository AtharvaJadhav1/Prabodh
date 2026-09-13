import { z } from 'zod';

const catalogPreferenceSchema = z.object({
  rank: z.number().int().min(1).max(3),
  psId: z.string().uuid(),
});

const customPreferenceSchema = z.object({
  rank: z.number().int().min(1).max(3),
  title: z.string().min(5),
  theme: z.string().min(2),
  category: z.enum(['software', 'hardware']),
  organisation: z.string().min(2).default('Student Innovation'),
  description: z.string().min(10),
});

const preferenceEntrySchema = z.union([catalogPreferenceSchema, customPreferenceSchema]);

export const submitPreferencesSchema = z
  .object({
    preferences: z.array(preferenceEntrySchema).min(1).max(3),
  })
  .superRefine((body, ctx) => {
    const ranks = body.preferences.map((p) => p.rank);
    if (new Set(ranks).size !== ranks.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Each preference must have a unique rank (1-3)' });
    }
    const psIds = body.preferences
      .map((p) => ('psId' in p ? p.psId : null))
      .filter((id): id is string => Boolean(id));
    if (new Set(psIds).size !== psIds.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'The same catalog problem statement cannot be picked twice' });
    }
  });

export type PreferenceEntry = z.infer<typeof preferenceEntrySchema>;
