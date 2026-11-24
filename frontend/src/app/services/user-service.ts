import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService, UserMe } from './auth-service';

// Adjust to match ProfileUpdate in auth_schemas.py
export interface ProfileUpdate {
  username?: string;
  phone_number?: string | null;
}

// Adjust to match TagSummary in schemas.py
export interface TagSummary {
  id: number;
  name: string;
}

@Service()
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiBaseUrl}/me`;

  /** GET /me -> UserMe (401 if the token is missing or invalid) */
  getMe(): Observable<UserMe> {
    return this.http.get<UserMe>(this.base).pipe(tap((u) => this.auth.setUser(u)));
  }

  /**
   * PATCH /me -> UserMe
   * Send only the fields you want to change.
   * 409 if the username is taken, 422 if username is null.
   */
  updateMe(changes: ProfileUpdate): Observable<UserMe> {
    return this.http
      .patch<UserMe>(this.base, changes)
      .pipe(tap((u) => this.auth.setUser(u)));
  }

  /** GET /me/preferred-tags -> TagSummary[] */
  getPreferredTags(): Observable<TagSummary[]> {
    return this.http.get<TagSummary[]>(`${this.base}/preferred-tags`);
  }

  /**
   * PUT /me/preferred-tags -> TagSummary[]
   * The list you send replaces the old one (send [] to clear).
   * 422 if any tag id doesn't exist.
   */
  replacePreferredTags(tagIds: number[]): Observable<TagSummary[]> {
    return this.http.put<TagSummary[]>(`${this.base}/preferred-tags`, {
      tag_ids: tagIds,
    });
  }
}
