import { z } from 'zod';
import { IsoDate } from './types';

export const ReviewSchema = z.object({
  id: z.guid(),
  event_id: z.guid(),
  user_id: z.guid(),
  username: z.string(),
  rating: z.number().int().min(1).max(5),
  content: z.string(),
  created_at: IsoDate,
});

export const ReviewListSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(ReviewSchema),
});

export const ReviewRequest = z.object({
  rating: z.number(),
  content: z.string(),
});

export type Review = z.infer<typeof ReviewSchema>;
export type ReviewList = z.infer<typeof ReviewListSchema>;
export type ReviewRequest = z.infer<typeof ReviewRequest>;
