import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AuthService } from './auth-service';
import { environment } from '../../environments/environment';

@Service()
export class SparksService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private base = `${environment.apiBaseUrl}`;
  private savedBase = `${this.base}/users/me/saved-events`;
  private eventBase = `${this.base}/events`;
}
