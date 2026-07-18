import { z } from 'zod';

export const trackerTypeSchema = z.enum(['boolean', 'numeric', 'duration']);
export type TrackerType = z.infer<typeof trackerTypeSchema>;

export const trackerFrequencySchema = z.enum(['daily', 'weekly', 'weekday']);
export type TrackerFrequency = z.infer<typeof trackerFrequencySchema>;

export const trackerSchema = z.object({
  trackerId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  type: trackerTypeSchema,
  categoryId: z.string(),
  target: z.number().nonnegative().optional().nullable(),
  unit: z.string().optional().nullable(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color'),
  icon: z.string().min(1, 'Icon/emoji is required'),
  frequency: trackerFrequencySchema,
  archived: z.boolean(),
  createdAt: z.string(),
});

export type Tracker = z.infer<typeof trackerSchema>;

export const createTrackerSchema = trackerSchema.omit({
  trackerId: true,
  archived: true,
  createdAt: true,
}).extend({
  trackerId: z.string().uuid().optional(),
  archived: z.boolean().optional(),
  createdAt: z.string().optional(),
});

export type CreateTrackerInput = z.infer<typeof createTrackerSchema>;

export const updateTrackerSchema = createTrackerSchema.partial();
export type UpdateTrackerInput = z.infer<typeof updateTrackerSchema>;
