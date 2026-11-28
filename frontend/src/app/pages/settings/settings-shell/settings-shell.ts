import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { Icon } from '../../../atoms/icon/icon';
import { Divider } from '../../../atoms/divider/divider';

interface MenuItem {
  path: string;
  label: string;
  desktopOnly?: boolean;
  mobileOnly?: boolean;
}

const stripUrl = (url: string) => url.split(/[?#]/)[0];

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
    { path: 'preferences', label: 'Preferences' },
    { path: 'notifications', label: 'Notifications' },
  ];

  private url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => stripUrl(e.urlAfterRedirects))
    ),
    { initialValue: stripUrl(this.router.url) }
  );

  private activeItem = computed(() => {
    const segments = this.url().split('/');
    return this.items.find((i) => segments.includes(i.path));
  });

  readonly hasChild = computed(() => !!this.activeItem());
  protected title = computed(() => this.activeItem()?.label ?? '');

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
