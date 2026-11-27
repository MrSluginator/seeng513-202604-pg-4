import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  EventDetail,
  EventList,
  Event,
} from '../../models/event.schema';
import { isUUID } from '../../utils/validation';
import { environment } from '../../environments/environment';
import {
  Review,
  ReviewListSchema,
  ReviewRequest,
  ReviewSchema,
} from '../../models/review.schema';
import { FilterProps } from '../../models/filters';
import { firstValueFrom } from 'rxjs';
import { EventDetails } from '../pages/event-details/event-details';

type Param = string | number | boolean | readonly (string | number | boolean)[];

export function filtersToParams(f: FilterProps): Record<string, Param> {
  const hasLocations = f.locations.length > 0;
  const params: Record<string, Param> = {
    sort: f.sort === 'distance' && !hasLocations ? 'start_time' : f.sort,
    order: f.sortDirection,
    limit: f.limit ?? 20,
    offset: f.offset ?? 0,
  };

  if (f.query?.trim()) params['q'] = f.query.trim();

  // Arrays: only send when non-empty. Angular repeats the key (?tag=a&tag=b)
  if (f.categories.length) params['category'] = f.categories;
  if (f.tags.length) params['tag'] = f.tags.map((t) => t.slug);
  if (hasLocations) {
    params['location'] = f.locations.map((l) => `${l.latitude},${l.longitude}`);
  }

  // Ranges: flatten to individual keys, and only when present
  if (f.timeRange) {
    params['starts_after'] = f.timeRange.start.toISOString();
    params['starts_before'] = f.timeRange.end.toISOString();
  }
  if (f.priceRange) {
    params['price_min'] = f.priceRange.lowest;
    params['max_price'] = f.priceRange.highest;
  }
  if (f.distanceRange && hasLocations) {
    params['distance_min'] = f.distanceRange.nearest;
    params['distance_max'] = f.distanceRange.furthest;
  }

  return params;
}

@Service()
export class EventService {
  private readonly http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/events`;

  getEvent(id: () => string) {
    return httpResource(
      () => (isUUID(id()) ? `${this.base}/${id()}` : undefined),
      { parse: Event.parse }
    );
  }

  getEventDetails(id: () => string) {
    return httpResource(
      () => (isUUID(id()) ? `${this.base}/${id()}` : undefined),
      { parse: EventDetail.parse }
    );
  }

  listEvents(filters: () => FilterProps) {
    return httpResource(
      () => ({
        url: this.base,
        params: filtersToParams(filters()),
      }),
      {
        parse: EventList.parse,
        defaultValue: { total: 0, items: [] },
      }
    );
  }

  fetchEvents(filters: FilterProps, limit = 20, offset = 0) {
    return firstValueFrom(
      this.http.get(this.base, {
        params: {
          ...filtersToParams(filters),
          limit,
          offset,
        },
      })
    ).then((res) => EventList.parse(res));
  }

  getFeatured(limit = 10) {
    return httpResource(
      () => ({
        url: this.base,
        params: {
          sort: 'visits_count',
          order: 'desc',
          limit,
        },
      }),
      {
        parse: EventList.parse,
        defaultValue: { total: 0, items: [] },
      }
    );
  }

  deleteEvent(eventId: string) {
    return this.http.delete(`${this.base}/${eventId}`);
  }

  createEvent(event: EventDetails) {
    return this.http.post(`${this.base}`, event)
  }
}
