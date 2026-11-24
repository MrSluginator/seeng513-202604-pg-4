import { Service, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  SignupRequest,
  UserMe,
} from '../../models/user.schema';

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

  signUp(payload: SignupRequest): Observable<AuthResponse> {
    return defer(() => {
      const body = SignupRequest.parse(payload);
      return this.http.post<unknown>(`${this.base}/signup`, body);
    }).pipe(
      map((res) => AuthResponse.parse(res)),
      tap((res) => this.setSession(res))
    );
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return defer(() => {
      const body = LoginRequest.parse(payload);
      return this.http.post<unknown>(`${this.base}/login`, body);
    }).pipe(
      map((res) => AuthResponse.parse(res)),
      tap((res) => this.setSession(res))
    );
  }

  logout(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      console.error('Failed to log out.');
    }
    this._token.set(null);
    this._user.set(null);
  }

  private setSession(res: AuthResponse): void {
    try {
      localStorage.setItem(TOKEN_KEY, res.access_token);
    } catch {
      console.error('Failed to set session.');
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
