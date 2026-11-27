import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, map, tap } from 'rxjs';
import { z } from 'zod';
import { environment } from '../../environments/environment';
import { AuthService } from './auth-service';
import { Tag } from '../../models/tag.schema';
import {
  PreferredTagsUpdate,
  ProfileUpdate,
  UserMe,
} from '../../models/user.schema';

const TagList = z.array(Tag);

@Service()
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiBaseUrl}/me`;

  getMe(): Observable<UserMe> {
    return this.http.get<unknown>(this.base).pipe(
      map((res) => UserMe.parse(res)),
      tap((u) => this.auth.setUser(u))
    );
  }

  updateMe(changes: z.input<typeof ProfileUpdate>): Observable<UserMe> {
    return defer(() => {
      const body = ProfileUpdate.parse(changes);
      return this.http.patch<unknown>(this.base, body);
    }).pipe(
      map((res) => UserMe.parse(res)),
      tap((u) => this.auth.setUser(u))
    );
  }

  /** GET /me/preferred-tags -> Tag[] */
  getPreferredTags(): Observable<Tag[]> {
    return this.http
      .get<unknown>(`${this.base}/preferred-tags`)
      .pipe(map((res) => TagList.parse(res)));
  }

  replacePreferredTags(tagIds: string[]): Observable<Tag[]> {
    return defer(() => {
      const body = PreferredTagsUpdate.parse({ tag_ids: tagIds });
      return this.http.put<unknown>(`${this.base}/preferred-tags`, body);
    }).pipe(map((res) => TagList.parse(res)));
  }
}
