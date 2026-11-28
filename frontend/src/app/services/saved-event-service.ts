import { HttpClient, httpResource } from '@angular/common/http';
import { inject, linkedSignal, Service } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  SavedEventList,
  SavedEventStatus,
} from '../../models/saved-event.schema';
import { AuthService } from './auth-service';
import { firstValueFrom, tap } from 'rxjs';
import { FilterProps } from '../../models/filters';
import { filtersToParams } from './event-service';

@Service()
export class SavedEventService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private base = `${environment.apiBaseUrl}`;
  private savedBase = `${this.base}/users/me/saved-events`;
  private eventBase = `${this.base}/events`;

  private readonly savedIdsResource = httpResource<string[]>(
    () => (this.auth.isLoggedIn() ? `${this.savedBase}/ids` : undefined),
    { defaultValue: [] }
  );

  private readonly savedIds = linkedSignal(
    () => new Set(this.savedIdsResource.value())
  );

  private setLocal(eventId: string, saved: boolean) {
    this.savedIds.update((current) => {
      const next = new Set(current);
      if (saved) next.add(eventId);
      else next.delete(eventId);
      return next;
    });
  }

  isSaved(eventId: string): boolean {
    return this.savedIds().has(eventId);
  }

  listSavedEvents(filters: () => FilterProps) {
    return httpResource(
      () => ({
        url: this.savedBase,
        params: filtersToParams(filters()),
      }),
      {
        parse: SavedEventList.parse,
        defaultValue: { total: 0, items: [] },
      }
    );
  }

  fetchSavedEvents(filters: FilterProps) {
    return firstValueFrom(
      this.http.get(this.savedBase, { params: filtersToParams(filters) })
    ).then((res) => SavedEventList.parse(res));
  }

  saveEvent(eventId: string) {
    return this.http
      .post(`${this.eventBase}/${eventId}/save`, null)
      .pipe(tap(() => this.setLocal(eventId, true)));
  }

  unsaveEvent(eventId: string) {
    return this.http
      .delete(`${this.eventBase}/${eventId}/save`)
      .pipe(tap(() => this.setLocal(eventId, false)));
  }

  toggleSave(eventId: string, save: boolean) {
    return save ? this.saveEvent(eventId) : this.unsaveEvent(eventId);
  }

  getSaveStatus(eventId: () => string) {
    return httpResource(() => `${this.eventBase}/${eventId()}/save-status`, {
      parse: SavedEventStatus.parse,
    });
  }

  recordEventVisit(eventId: string) {
    return this.http.post(`${this.eventBase}/${eventId}/visit`, null);
  }
}
