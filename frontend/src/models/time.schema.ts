import { z } from 'zod';
import { IsoDate } from './types';

export const TimeSchema = z.object({
  start_time: IsoDate.nullable(),
  end_time: IsoDate.nullable(),
  // only available in event detail
  recurrence_pattern: z.string().optional(),
  recurrence_end_date: IsoDate.nullable().optional(),
});

export type Time = z.infer<typeof TimeSchema>;
