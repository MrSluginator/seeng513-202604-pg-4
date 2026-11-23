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

const processEvent = (raw: unknown) => {
  if (typeof raw !== 'object' || raw === null) return raw;
  const {
    location_name,
    latitude,
    longitude,
    start_time,
    end_time,
    recurrence_pattern,
    recurrence_end_date,
    price_min,
    price_max,
    currency,
    ...rest
  } = raw as Record<string, unknown>;
  return {
    ...rest,
    location: {
      name: location_name,
      latitude: latitude,
      longitude: longitude,
    },
    time: {
      start_time: start_time,
      end_time: end_time,
      recurrence_pattern: recurrence_pattern,
      recurrence_end_date: recurrence_end_date,
    },
    price: {
      price_min: price_min,
      price_max: price_max,
      currency: currency,
    },
  };
};

const EventSchemaBase = z.object({
  id: z.uuid(),

  title: z.string().max(255),
  summary: z.string().max(255).nullable(),

  time: TimeSchema.nullable(),
  price: PriceSchema.nullable(),
  location: LocationSchema.nullable(),

  visits_count: z.number().int().nonnegative(),
  review_count: z.number().int().nonnegative(),
  rating: Decimal.pipe(z.number().min(0).max(5)).nullable(),

  photos: z.array(PhotoSchema),
  tags: z.array(TagSchema),

  saved: z.boolean(),
});

const EventDetailSchemaBase = EventSchemaBase.extend({
  creator_id: z.uuid(),
  description: z.string().nullable(),
  crowd_by_hour: z.record(z.string(), z.any()),
  shares_count: z.number().int().nonnegative(),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export const EventSchema = z.preprocess(processEvent, EventSchemaBase);
export const EventDetailSchema = z.preprocess(processEvent, EventDetailSchemaBase);
export const EventListSchema = z.object({
  total: z.number().int(),
  items: z.array(EventSchema),
})

export type Event = z.infer<typeof EventSchema>;
export type EventDetail = z.infer<typeof EventDetailSchema>;
export type EventList = z.infer<typeof EventListSchema>;
