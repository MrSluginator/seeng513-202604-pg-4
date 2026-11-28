import { z } from 'zod';

export const Photo = z.object({
  id: z.guid(),
  url: z.string(),
  is_cover: z.boolean(),
  display_order: z.number().int(),
});

export type Photo = z.infer<typeof Photo>;
