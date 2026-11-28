import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { AccountType } from '../../models/user.schema';

/** Protects pages that need a logged-in user. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  // Remember where they were going so login can send them back
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/** Keeps logged-in users out of login/signup pages. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isLoggedIn() ? router.createUrlTree(['/']) : true;
};

export const roleGuard = (...allowed: AccountType[]): CanActivateFn => {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    const type = auth.user()?.account_type as AccountType | undefined;
    if (type && allowed.includes(type)) return true;

    return router.createUrlTree(['/forbidden']);
  };
};
