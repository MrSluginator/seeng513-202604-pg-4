import { z } from 'zod';

export const PhotoSchema = z.object({
  id: z.uuid(),
  url: z.string(),
});

export type Photo = z.infer<typeof PhotoSchema>;
