// settings/settings.routes.ts
import { Routes } from '@angular/router';
import { SettingsShell } from './settings-shell/settings-shell';

export const routes: Routes = [
  {
    path: '',
    component: SettingsShell, // fine here, it's already inside a lazy chunk
    children: [
      { path: '', pathMatch: 'full', children: [] },
      {
        path: 'account',
        title: 'Account',
        loadComponent: () => import('./account/account').then(m => m.Account),
      },
      // ...
    ],
  },
];
