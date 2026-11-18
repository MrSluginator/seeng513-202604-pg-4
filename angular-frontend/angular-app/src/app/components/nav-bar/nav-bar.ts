import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Button } from '../../atoms/button/button';
import { Icon } from '../../atoms/icon/icon';
import { Logo } from '../../atoms/logo/logo';
import { TextInput } from '../../atoms/text-input/text-input';
import { SearchBar, SearchResult } from '../../molecules/search-bar/search-bar';


@Component({
  selector: 'f-nav-bar',
  imports: [RouterLink, RouterLinkActive, Button, Icon, Logo, TextInput, SearchBar],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavBar {
  private readonly router = inject(Router);

  readonly signedIn = input.required<boolean>();
  readonly placeholder = input('Search this page');
  readonly results = input<SearchResult[]>([]);

  protected onSettingsClick(): void {
    this.router.navigate(['/settings']);
  }

  protected onSignInClick(): void {
    this.router.navigate(['/sign_in']);
  }
}