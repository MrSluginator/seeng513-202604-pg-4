import { Service, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Adjust to match your UserMe schema in auth_schemas.py
export interface UserMe {
  id: string | number;
  username: string;
  email: string;
  account_type: string;
}

export interface AuthResponse {
  access_token: string;
  user: UserMe;
}

const TOKEN_KEY = 'access_token';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/auth`;

  private readonly _token = signal<string | null>(this.readToken());
  private readonly _user = signal<UserMe | null>(null);

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());

  setUser(user: UserMe): void {
    this._user.set(user);
  }

  /** POST /auth/signup -> 201 AuthResponse (409 if username/email taken) */
  signUp(payload: SignupRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/signup`, payload)
      .pipe(tap((res) => this.setSession(res)));
  }

  /** POST /auth/login -> AuthResponse (401 invalid credentials, 429 rate limited) */
  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/login`, payload)
      .pipe(tap((res) => this.setSession(res)));
  }

  logout(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      console.error("Failed to log out.");
    }
    this._token.set(null);
    this._user.set(null);
  }

  private setSession(res: AuthResponse): void {
    try {
      localStorage.setItem(TOKEN_KEY, res.access_token);
    } catch {
      console.error("Failed to set session.");
    }
    this._token.set(res.access_token);
    this._user.set(res.user);
  }

  private readToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
}
