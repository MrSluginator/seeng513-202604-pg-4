import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { EventDetailsSchema, EventSchema } from '../../models/event.schema';
import { isUUID } from '../../utils/validation';
import { FilterProps } from '../../models/filters';
import { z } from 'zod';

type Param = string | number | boolean | readonly (string | number | boolean)[];

function filtersToParams(f: FilterProps): Record<string, Param> {
  const params: Record<string, Param> = {
    sort: f.sort,
    sort_direction: f.sortDirection,
  };

  // Arrays: only send when non-empty. Angular repeats the key (?tag=a&tag=b)
  if (f.categories.length) params['category'] = f.categories;
  if (f.tags.length) params['tag'] = f.tags.map((t) => t.id);
  if (f.locations.length) {
    params['location'] = f.locations.map((l) => `${l.latitude},${l.longitude}`);
  }

  // Ranges: flatten to individual keys, and only when present
  if (f.timeRange) {
    params['start_after'] = f.timeRange.start.toISOString();
    params['end_before'] = f.timeRange.end.toISOString();
  }
  if (f.priceRange) {
    params['price_min'] = f.priceRange.lowest;
    params['price_max'] = f.priceRange.highest;
  }
  if (f.distanceRange) {
    params['distance_min'] = f.distanceRange.nearest;
    params['distance_max'] = f.distanceRange.furthest;
  }

  return params;
}

@Service()
export class EventService {
  private readonly http = inject(HttpClient);

  getEvent(id: () => string) {
    return httpResource(
      () => {
        return isUUID(id()) ? `/api/events/${id()}` : undefined;
      },
      { parse: EventSchema.parse }
    );
  }

  getEventDetails(id: () => string) {
    return httpResource(
      () => {
        return isUUID(id()) ? `/api/events/${id()}` : undefined;
      },
      { parse: EventDetailsSchema.parse }
    );
  }

  getEventFeed(filters: () => FilterProps) {
    return httpResource(
      () => ({
        url: '/api/events',
        params: filtersToParams(filters()),
      }),
      {
        parse: z.array(EventSchema).parse,
        defaultValue: [],
      }
    );
  }

  getFeatured() {
    return httpResource(() => '/api/events/featured', {
      parse: z.array(EventSchema).parse,
    });
  }
}
