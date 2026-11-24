import { z } from 'zod';

export const PhotoSchema = z.object({
  id: z.guid(),
  url: z.string(),
  is_cover: z.boolean(),
  display_order: z.number().int(),
});

export type Photo = z.infer<typeof PhotoSchema>;
