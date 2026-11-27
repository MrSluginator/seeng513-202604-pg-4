import { z } from 'zod';
import { EventSchema } from './event.schema';
import { IsoDate } from './types';

export const SavedEvent = z.object({
  event: EventSchema,
  user_visits: z.int(),
  created_at: IsoDate,
  updated_at: IsoDate,
});

export const SavedEventList = z.object({
  total: z.int(),
  items: z.array(SavedEvent),
});

export const SavedEventStatus = z.object({
  event_id: z.guid(),
  is_saved: z.boolean(),
  user_visits: z.int(),
});

export const EventVisitResponse = z.object({
  event_id: z.guid(),
  user_visits: z.int(),
  visits_count: z.int(),
});

export type SavedEvent = z.infer<typeof SavedEvent>;
export type SavedEventList = z.infer<typeof SavedEventList>;
export type SavedEventStatus = z.infer<typeof SavedEventStatus>;
export type EventVisitResponse = z.infer<typeof EventVisitResponse>;
