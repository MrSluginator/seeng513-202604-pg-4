import { z } from 'zod';

export const Review = z.object({});

export type Review = z.infer<typeof Review>;
