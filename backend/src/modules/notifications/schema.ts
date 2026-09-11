import { z } from 'zod';

export const broadcastSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(3),
  filterCriteria: z
    .object({
      theme: z.string().optional(),
      institute: z.string().optional(),
      role: z.enum(['student', 'institute_mentor', 'industry_mentor', 'admin']).optional(),
    })
    .optional()
    .default({}),
});

export const commentSchema = z.object({
  message: z.string().min(1).max(4000),
  parentCommentId: z.string().uuid().optional(),
});
