import { z } from 'zod';

export const ReviewSchema = z.object({

});

export type Review = z.infer<typeof ReviewSchema>;
