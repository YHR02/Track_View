import { z } from 'zod';

export const categorySchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1, 'Name is required'),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color'),
  icon: z.string().min(1, 'Icon is required'),
  createdAt: z.string(),
});

export type Category = z.infer<typeof categorySchema>;
