import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  SavedEventList,
  SavedEventStatus,
} from '../../models/saved-event.schema';

@Service()
export class SavedEventService {
  private readonly http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}`;
  private eventBase = `${this.base}/events`;

  listSavedEvents() {
    return httpResource(() => `${this.base}/users/me/saved-events`, {
      parse: SavedEventList.parse,
    });
  }

  saveEvent(eventId: string) {
    return this.http.post(`${this.eventBase}/${eventId}/save`, null);
  }

  unsaveEvent(eventId: string) {
    return this.http.delete(`${this.eventBase}/${eventId}/save`);
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
