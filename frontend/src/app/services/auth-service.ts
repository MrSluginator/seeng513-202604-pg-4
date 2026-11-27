import { Service, signal } from '@angular/core';

const TOKEN_STORAGE_KEY = 'flare_access_token';

@Service()
export class AuthService {
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

  private readStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
