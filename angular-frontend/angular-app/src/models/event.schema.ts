import { z } from 'zod';
import { LocationSchema } from './location.schema';
import { TimeSchema } from './time.schema';
import { UserSchema } from './user.schema';
import { PhotoSchema } from './photo.schema';
import { ReviewSchema } from './review.schema';
import { TagSchema } from './tag.schema';
import { ScrapedEventSchema } from './scraped-event.schema';
import { Decimal, IsoDate } from './types';
import { PriceSchema } from './price.schema';

export const EventSchema = z.object({
  id: z.uuid(),
  creator_id: z.uuid().nullable(),

  title: z.string().max(255),
  summary: z.string().max(255).nullable(),
  description: z.string().nullable(),

  time: TimeSchema.nullable(),
  price: PriceSchema.nullable(),
  location: LocationSchema.nullable(),

  crowd_by_hour: z.record(z.string(), z.unknown()),

  visits_count: z.number().int().nonnegative(),
  shares_count: z.number().int().nonnegative(),
  review_count: z.number().int().nonnegative(),
  rating: Decimal.pipe(z.number().min(0).max(5)).nullable(),

  created_at: IsoDate,
  updated_at: IsoDate,
});

export const EventDetailsSchema = EventSchema.extend({
  creator: UserSchema,
  photos: z.array(PhotoSchema),
  reviews: z.array(ReviewSchema),
  tags: z.array(TagSchema),
  scrapped_source: ScrapedEventSchema.nullable(),
})

export type Event = z.infer<typeof EventSchema>;
export type EventDetails = z.infer<typeof EventDetailsSchema>;
