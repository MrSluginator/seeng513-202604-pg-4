import { z } from 'zod';
import { Decimal } from './types';

export const PriceSchema = z.object({
  price_min: Decimal.nullable(),
  price_max: Decimal.nullable(),
  currency: z.string().length(3),
});

export type Price = z.infer<typeof PriceSchema>;
