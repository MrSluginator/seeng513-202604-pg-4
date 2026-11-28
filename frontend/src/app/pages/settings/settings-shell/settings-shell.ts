import { Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Icon } from '../../../atoms/icon/icon';
import { Divider } from '../../../atoms/divider/divider';

interface MenuItem {
  path: string;
  label: string;
  desktopOnly?: boolean;
  mobileOnly?: boolean;
}

@Component({
  selector: 'f-settings-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Divider],
  templateUrl: './settings-shell.html',
  styleUrl: './settings-shell.css',
})
export class SettingsShell {
  private router = inject(Router);

  readonly items: MenuItem[] = [
    { path: 'account', label: 'Account' },
    { path: 'connect-socials', label: 'Connect Socials' },
    { path: 'privacy', label: 'Privacy' },
    { path: 'preferences', label: 'Preferences' },
    { path: 'notifications', label: 'Notifications' },
  ];

  /** true when a child page (e.g. /settings/account) is active */
  readonly hasChild = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(
        () =>
          this.router.url.split(/[?#]/)[0].replace(/\/$/, '') !== '/settings'
      )
    ),
    { initialValue: false }
  );

  private desktop = window.matchMedia('(min-width: 768px)');

  constructor() {
    // On desktop, never sit on the empty index route
    effect(() => {
      if (!this.hasChild() && this.desktop.matches) {
        this.router.navigate(['/settings/account'], { replaceUrl: true });
      }
    });
  }
}
