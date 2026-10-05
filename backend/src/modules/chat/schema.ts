import { z } from 'zod';

// Message text is validated (and turned into a friendly message) by normalizeMessageBody in the
// service, so the schema only checks types.
export const friendRequestSchema = z.object({
  userId: z.string().min(1).max(64),
});

export const sendMessageSchema = z.object({
  body: z.string().max(20000),
  clientId: z.string().min(1).max(64).nullish(),
});
