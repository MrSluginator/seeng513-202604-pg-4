import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Button } from '../../atoms/button/button';
import { Icon } from '../../atoms/icon/icon';
import { Logo } from '../../atoms/logo/logo';
import { SearchBar, SearchResult } from '../../molecules/search-bar/search-bar';
import { EventService } from '../../services/api-service';
import { NavbarService } from '../../services/navbar-service';
import { Event } from '../../../models/event.schema';
import { DEFAULT_FILTERS } from '../../../models/filters';

@Component({
  selector: 'f-nav-bar',
  imports: [RouterLink, RouterLinkActive, Button, Icon, Logo, SearchBar],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavBar {
  private readonly router = inject(Router);
  private readonly eventApi = inject(EventService);
  protected readonly nav = inject(NavbarService);

  // Bound to the search bar with [(query)]
  protected readonly query = signal('');

  private readonly debouncedQuery = toSignal(
    toObservable(this.query).pipe(debounceTime(250), distinctUntilChanged()),
    { initialValue: '' }
  );

  private readonly searchRes = this.eventApi.searchResource(
    () => this.debouncedQuery(),
    () => DEFAULT_FILTERS,
    6
  );

  protected readonly isSearching = computed(
    () =>
      this.query().trim() !== this.debouncedQuery().trim() ||
      this.searchRes.isLoading()
  );

  protected readonly suggestions = computed<SearchResult<Event>[]>(() => {
    if (!this.debouncedQuery().trim() || !this.searchRes.hasValue()) {
      return [];
    }
    return this.searchRes.value().items.map((event) => ({
      label: event.title,
      value: event,
    }));
  });

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
