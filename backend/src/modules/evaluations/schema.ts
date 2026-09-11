import { z } from 'zod';

export const createEvaluationSchema = z.object({
  teamId: z.string().uuid(),
  stageId: z.string().uuid(),
  rubricId: z.string().uuid(),
  score: z.number().min(0).max(100),
  feedback: z.string().optional(),
});

export const publishSchema = z.object({
  teamIds: z.array(z.string().uuid()).optional(),
});
