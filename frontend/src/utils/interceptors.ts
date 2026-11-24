import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../app/services/auth-service';
import { environment } from '../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Only talk to our own API, never leak the token to other hosts
  const isApiCall = req.url.startsWith(environment.apiBaseUrl);

  // Login and signup return 401/409 for bad input, not for an expired session
  const isAuthEndpoint =
    req.url.startsWith(`${environment.apiBaseUrl}/auth/login`) ||
    req.url.startsWith(`${environment.apiBaseUrl}/auth/signup`);

  const token = auth.token();
  const authReq =
    isApiCall && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        isApiCall &&
        !isAuthEndpoint &&
        auth.isLoggedIn()
      ) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
