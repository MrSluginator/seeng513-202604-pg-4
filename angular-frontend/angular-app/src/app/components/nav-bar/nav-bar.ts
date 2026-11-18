import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Button } from '../../atoms/button/button';
import { Icon } from '../../atoms/icon/icon';
import { Logo } from '../../atoms/logo/logo';
import { SearchBar, SearchResult } from '../../molecules/search-bar/search-bar';

@Component({
  selector: 'f-nav-bar',
  imports: [RouterLink, RouterLinkActive, Button, Icon, Logo, SearchBar],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavBar {
  private readonly router = inject(Router);

  readonly signedIn = input.required<boolean>();
  readonly placeholder = input('Search this page');
  readonly results = input<SearchResult[]>([]);

  // Bound to the search bar with [(query)]
  protected readonly query = signal('');

  protected onResultSelected(result: SearchResult): void {
    this.router.navigate(['/search'], { queryParams: { q: result.label } });
  }

  protected onSettingsClick(): void {
    this.router.navigate(['/settings']);
  }

  protected onSignInClick(): void {
    this.router.navigate(['/sign_in']);
  }
}