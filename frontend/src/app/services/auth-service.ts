import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, isDevMode, Service, signal } from '@angular/core';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

const TOKEN_STORAGE_KEY = 'flare_access_token';
const DEV_CREDENTIALS = {
  username: 'flare_dev',
  email: 'dev@flare.example.com',
  password: 'devpassword123',
};

interface AuthResponse {
  access_token: string;
}

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authBase = `${environment.apiBaseUrl}/auth`;

  private readonly _token = signal<string | null>(this.readStoredToken());
  readonly token = this._token.asReadonly();

  setToken(token: string | null): void {
    this._token.set(token);
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors (e.g., private browsing)
    }
  }

  /**
   * Temporary dev-only helper: signs in (or signs up on first run) a local
   * dev account so protected endpoints like GET /heatmap can be tested locally.
   */
  async devSignIn(): Promise<boolean> {
    if (!isDevMode()) return false;

    const response = await firstValueFrom(
      this.http
        .post<AuthResponse>(`${this.authBase}/login`, {
          email: DEV_CREDENTIALS.email,
          password: DEV_CREDENTIALS.password,
        })
        .pipe(
          catchError((err: unknown) => {
            if (err instanceof HttpErrorResponse && err.status === 401) {
              return this.http.post<AuthResponse>(
                `${this.authBase}/signup`,
                DEV_CREDENTIALS
              );
            }
            return of(null);
          }),
          switchMap((res) => of(res)),
          catchError(() => of(null))
        )
    );

    if (!response?.access_token) return false;
    this.setToken(response.access_token);
    return true;
  }

  private readStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
