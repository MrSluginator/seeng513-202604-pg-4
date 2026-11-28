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
import { ProfileButton } from '../../molecules/profile-button/profile-button';
import {
  SearchBar,
  SearchFn,
  SearchResult,
} from '../../molecules/search-bar/search-bar';
import { AuthService } from '../../services/auth-service';
import { EventService } from '../../services/event-service';
import { Event } from '../../../models/event.schema';
import { DEFAULT_FILTERS } from '../../../models/filters';

@Component({
  selector: 'f-nav-bar',
  imports: [
    RouterLink,
    RouterLinkActive,
    Button,
    Icon,
    Logo,
    SearchBar,
    ProfileButton,
  ],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavBar {
  private readonly router = inject(Router);
  private readonly eventApi = inject(EventService);
  protected readonly auth = inject(AuthService);

  // Bound to the search bar with [(query)]
  protected readonly query = signal('');

  protected readonly searchEvents: SearchFn<Event> = async (query) => {
    const res = await this.eventApi.fetchEvents(
      { ...DEFAULT_FILTERS, query },
      6,
      0
    );
    return res.items.map((event) => ({
      label: event.title,
      value: event,
    }));
  };

  protected onResultSelected(result: SearchResult<Event>): void {
    this.router.navigate(['/event', result.value.id]);
  }

  protected onSearchSubmitted(query: string): void {
    const trimmed = query.trim();
    if (!trimmed) return;
    this.router.navigate(['/search'], { queryParams: { q: trimmed } });
  }

  protected onSettingsClick(): void {
    this.router.navigate(['/settings']);
  }

  protected onSignInClick(): void {
    this.router.navigate(['/sign_in']);
  }
}
