import { z } from 'zod';
import { IsoDate } from './types';

export const TimeSchema = z.object({
  start_time: IsoDate.nullable(),
  end_time: IsoDate.nullable(),

  recurrence_pattern: z.string(),
  recurrence_end_date: IsoDate.nullable()
});

export type Time = z.infer<typeof TimeSchema>
