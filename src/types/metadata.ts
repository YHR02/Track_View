import { z } from 'zod';

export const metadataSchema = z.object({
  workspaceVersion: z.string(),
  createdAt: z.string(),
  lastUpdated: z.string(),
  ownerEmail: z.string().email(),
  ownerName: z.string(),
  timezone: z.string(),
  currency: z.string(),
  schemaVersion: z.string(),
  appVersion: z.string(),
});

export type WorkspaceMetadata = z.infer<typeof metadataSchema>;
