import { z } from 'zod';

export const createStageSchema = z.object({
  name: z.string().min(2),
  sequence: z.number().int().min(1),
  deadline: z.string().datetime(),
});

export const createRubricSchema = z.object({
  criteria: z.string().min(2),
  weightage: z.number().min(0).max(100),
});

export const deliverableSchema = z.object({
  teamId: z.string().uuid(),
  pptUrl: z.string().optional(),
  reportUrl: z.string().optional(),
  videoUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
});

export const presignSchema = z.object({
  teamId: z.string().uuid(),
  filename: z.string().min(1),
  contentType: z.string().min(3),
  contentLength: z.number().int().positive(),
  kind: z.enum(['ppt', 'report', 'video']),
});

export const statusPatchSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'submitted', 'reviewed', 'qualified', 'rejected']),
});

/** Direct PPTX/PDF upload through the API (avoids browser→S3 CORS hangs). */
export const directUploadSchema = z.object({
  teamId: z.string().uuid(),
  filename: z.string().min(1),
  contentType: z.string().min(3).optional(),
  dataBase64: z.string().min(1),
});
