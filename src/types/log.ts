import { z } from 'zod';

export const logSchema = z.object({
  entryId: z.string().uuid(),
  trackerId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  value: z.string(),
  note: z.string().optional().nullable(),
  createdAt: z.string(),
});

export type Log = z.infer<typeof logSchema>;

export const upsertLogSchema = z.object({
  trackerId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.string(),
  note: z.string().optional().nullable(),
});

export type UpsertLogInput = z.infer<typeof upsertLogSchema>;
