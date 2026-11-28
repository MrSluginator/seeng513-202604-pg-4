// settings/settings.routes.ts
import { Routes } from '@angular/router';
import { SettingsShell } from './settings-shell/settings-shell';

export const routes: Routes = [
  {
    path: '',
    component: SettingsShell,
    children: [
      { path: '', pathMatch: 'full', children: [] },
      {
        path: 'account',
        title: 'Account',
        loadComponent: () => import('./account/account').then((m) => m.Account),
      },
      {
        path: 'connect-socials',
        title: 'Connect Socials',
        loadComponent: () =>
          import('./connect-socials/connect-socials').then(
            (m) => m.ConnectSocials
          ),
      },
      {
        path: 'preferences',
        title: 'Preferences',
        loadComponent: () =>
          import('./preferences/preferences').then((m) => m.Preferences),
      },
      {
        path: 'notifications',
        title: 'Notifications',
        loadComponent: () =>
          import('./notifications/notifications').then((m) => m.Notifications),
      },
    ],
  },
];
