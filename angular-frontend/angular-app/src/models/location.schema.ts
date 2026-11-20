import { z } from 'zod';
import { Decimal } from './types';

export const LocationSchema = z.object({
  name: z.string().nullable(),
  latitude: Decimal.pipe(z.number().min(-90).max(90)).nullable(),
  longitude: Decimal.pipe(z.number().min(-180).max(180)).nullable(),
});

export type Location = z.infer<typeof Location>;
