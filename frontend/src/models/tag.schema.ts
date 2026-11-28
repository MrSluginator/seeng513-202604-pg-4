import { z } from 'zod';

export const Tag = z.object({
  id: z.guid(),
  name: z.string(),
  slug: z.string(),
});

export type Tag = z.infer<typeof Tag>;
