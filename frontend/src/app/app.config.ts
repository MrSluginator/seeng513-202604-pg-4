import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import {
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { AuthService } from './services/auth-service';
import { UserService } from './services/user-service';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from '../utils/interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(async () => {
      const auth = inject(AuthService);
      const users = inject(UserService);

      if (!auth.isLoggedIn()) return;

      try {
        await firstValueFrom(users.getMe());
      } catch (err) {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          auth.logout();
        }
      }
    }),
  ],
};
