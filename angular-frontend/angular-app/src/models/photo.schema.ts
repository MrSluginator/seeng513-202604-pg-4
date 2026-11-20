import { z } from 'zod';

export const PhotoSchema = z.object({

});

export type Photo = z.infer<typeof PhotoSchema>;
