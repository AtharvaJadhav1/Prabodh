import { z } from 'zod';

export const clerkUserWebhookSchema = z.object({
  type: z.string(),
  data: z.record(z.unknown()),
});
