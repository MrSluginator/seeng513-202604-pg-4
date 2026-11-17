import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing/landing').then(m => m.Landing) },
  { path: 'map', loadComponent: () => import('./pages/heat-map/heat-map').then(m => m.HeatMap) },
  { path: 'saved', loadComponent: () => import('./pages/saved/saved').then(m => m.Saved) },
  { path: 'post', loadComponent: () => import('./pages/post-event/post-event').then(m => m.PostEvent) },
  { path: 'settings', loadComponent: () => import('./pages/settings/settings').then(m => m.Settings) },
  { path: 'sign_in', loadComponent: () => import('./pages/sign-in/sign-in').then(m => m.SignIn) },
  { path: 'event/:id', loadComponent: () => import('./pages/event-details/event-details').then(m => m.EventDetails) },
  { path: 'testing', loadComponent: () => import('./pages/testing/testing').then(m => m.Testing) },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFound) },
];