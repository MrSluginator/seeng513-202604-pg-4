import { Routes, UrlMatcher } from '@angular/router';
import { guestGuard } from './guards/auth-guard';

export const authMatcher: UrlMatcher = (segments) =>
  segments.length === 1 &&
  (segments[0].path === 'login' || segments[0].path === 'signup')
    ? { consumed: segments, posParams: { mode: segments[0] } }
    : null;

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'map',
    loadComponent: () =>
      import('./pages/heat-map/heat-map').then((m) => m.HeatMap),
  },
  {
    path: 'saved',
    loadComponent: () => import('./pages/saved/saved').then((m) => m.Saved),
  },
  {
    path: 'post',
    loadComponent: () =>
      import('./pages/post-event/post-event').then((m) => m.PostEvent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings').then((m) => m.Settings),
  },
  {
    matcher: authMatcher,
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/sign-in/sign-in').then((m) => m.SignIn),
  },
  { path: 'sign_in', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'event/:id',
    loadComponent: () =>
      import('./pages/event-details/event-details').then((m) => m.EventDetails),
  },
  {
    path: 'testing',
    loadComponent: () =>
      import('./pages/testing/testing').then((m) => m.Testing),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
