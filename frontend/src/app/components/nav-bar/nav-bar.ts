import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Button } from '../../atoms/button/button';
import { Icon } from '../../atoms/icon/icon';
import { Logo } from '../../atoms/logo/logo';
import { SearchBar, SearchResult } from '../../molecules/search-bar/search-bar';
import { NavbarService } from '../../services/navbar-service';
import { NgTemplateOutlet } from '@angular/common';
import { AuthService } from '../../services/auth-service';
import { ProfileButton } from '../../molecules/profile-button/profile-button';

@Component({
  selector: 'f-nav-bar',
  imports: [
    RouterLink,
    RouterLinkActive,
    Button,
    Icon,
    Logo,
    SearchBar,
    NgTemplateOutlet,
    ProfileButton,
  ],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavBar<T> {
  private readonly router = inject(Router);
  protected readonly nav = inject(NavbarService);
  protected readonly auth = inject(AuthService);

  // Bound to the search bar with [(query)]
  protected readonly query = signal('');

  protected onResultSelected(result: SearchResult<T>): void {
    this.router.navigate(['/search'], { queryParams: { q: result.label } });
  }

  protected onSettingsClick(): void {
    this.router.navigate(['/settings']);
  }

  protected onSignInClick(): void {
    this.router.navigate(['/sign_in']);
  }
}
