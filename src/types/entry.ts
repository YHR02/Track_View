import { z } from 'zod';

export const entrySchema = z.object({
  entryId: z.string().uuid(),
  trackerId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  value: z.string(),
  note: z.string().optional().nullable(),
  createdAt: z.string(),
});

export type Entry = z.infer<typeof entrySchema>;

export const upsertEntrySchema = z.object({
  trackerId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.string(),
  note: z.string().optional().nullable(),
});

export type UpsertEntryInput = z.infer<typeof upsertEntrySchema>;

// Backward compatibility aliases
export type Log = Entry;
export const logSchema = entrySchema;
