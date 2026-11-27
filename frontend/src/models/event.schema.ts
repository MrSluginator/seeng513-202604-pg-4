import { z } from 'zod';
import { Location } from './location.schema';
import { Time } from './time.schema';
import { Photo } from './photo.schema';
import { Tag } from './tag.schema';
import { Decimal, IsoDate } from './types';
import { Price } from './price.schema';

const processEvent = (raw: Record<string, unknown>) => {
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
  } = raw;
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

const flattenEvent = (data: z.infer<typeof EventCreateBase | typeof EventUpdateBase>) => {
  const { time, price, location, tags, ...rest} = data;
  return {
    ...rest,
    start_time: time?.start_time ?? null,
    end_time: time?.end_time ?? null,
    recurrence_pattern: time?.recurrence_pattern ?? 'none',
    recurrence_end_date: time?.recurrence_end_date ?? null,

    price_min: price?.price_min ?? null,
    price_max: price?.price_max ?? null,
    currency: price?.currency ?? 'CAD',

    location_name: location?.name ?? null,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,

    tag_ids: tags.map((t) => t.id),
  }
}

const EventBase = z.object({
  id: z.guid(),

  title: z.string().max(255),
  summary: z.string().max(255).nullable(),

  time: Time.nullable(),
  price: Price.nullable(),
  location: Location.nullable(),

  visits_count: z.number().int().nonnegative(),
  review_count: z.number().int().nonnegative(),
  rating: Decimal.pipe(z.number().min(0).max(5)).nullable(),

  photos: z.array(Photo),
  tags: z.array(Tag),

  is_saved: z.boolean().optional(),
});

const EventDetailBase = EventBase.extend({
  creator_id: z.guid(),
  description: z.string().nullable(),
  crowd_by_hour: z.record(z.string(), z.any()),
  shares_count: z.number().int().nonnegative(),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export const Event = z.preprocess(processEvent, EventBase);
export const EventDetail = z.preprocess(
  processEvent,
  EventDetailBase
);
export const EventList = z.object({
  total: z.number().int(),
  items: z.array(Event),
});

const EventCreateBase = z.object({
  title: z.string().min(1).max(255),
  summary: z.string().max(255).nullable().optional(),
  description: z.string().nullable().optional(),

  time: Time.nullable().optional(),
  price: Price.nullable().optional(),
  location: Location.nullable().optional(),

  tags: z.array(Tag).default([]),
});

const EventUpdateBase = z.object({
  title: z.string().min(1).max(255).optional(),
  summary: z.string().max(255).nullable().optional(),
  description: z.string().nullable().optional(),

  time: Time.nullable().optional(),
  price: Price.nullable().optional(),
  location: Location.nullable().optional(),

  tags: z.array(Tag).default([]),
});
export const EventCreate = EventCreateBase.transform(flattenEvent);
export const EventUpdate = EventUpdateBase.transform(flattenEvent);

export type Event = z.infer<typeof Event>;
export type EventDetail = z.infer<typeof EventDetail>;
export type EventList = z.infer<typeof EventList>;
export type EventCreate = z.infer<typeof EventCreate>;
export type EventUpdate = z.infer<typeof EventUpdate>;
