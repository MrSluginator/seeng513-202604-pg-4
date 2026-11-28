import { z } from 'zod';

export const SparkVote = z.object({
  amount: z.literal([1, -1]),
});

export const SparkGiven = z.object({
  spark_rating: z.int().nonnegative(),
});

export type SparkVote = z.infer<typeof SparkVote>;
export type SparkGiven = z.infer<typeof SparkGiven>;
