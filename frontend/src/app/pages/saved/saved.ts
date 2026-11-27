import { Component, computed, inject } from '@angular/core';
import { FilterService } from '../../services/filter-service';
import { EventService } from '../../services/event-service';
import { NavbarService } from '../../services/navbar-service';
import { Router } from '@angular/router';
import {
  MenuOption,
  MenuButton,
} from '../../molecules/menu-button/menu-button';
import { Sort, SORT_OPTIONS } from '../../../models/filters';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  SearchResult,
  SearchBar,
  SearchFn,
  SearchResultTemplate,
} from '../../molecules/search-bar/search-bar';
import { Event } from '../../../models/event.schema';
import { Widget } from '../../atoms/widget/widget';
import { FilterButton } from '../../molecules/filter-button/filter-button';
import { EventGrid } from '../../components/event-grid/event-grid';
import { SavedEventService } from '../../services/saved-event-service';
import { Footer } from '../../components/footer/footer';

@Component({
  imports: [
    Widget,
    MenuButton,
    FilterButton,
    EventGrid,
    SearchBar,
    SearchResultTemplate,
    Footer,
  ],
  selector: 'f-saved',
  styleUrl: './saved.css',
  templateUrl: './saved.html',
})
export class Saved {
  private readonly filterSvc = inject(FilterService);
  private readonly eventApi = inject(EventService);
  private readonly savedEventApi = inject(SavedEventService);
  private readonly navbarSvc = inject(NavbarService);
  private readonly router = inject(Router);

  private readonly _saved = this.savedEventApi.listSavedEvents(
    this.filterSvc.filters
  );
  protected readonly saved = computed<Event[]>(
    () =>
      this._saved.value()?.items.map((info) => ({
        ...info.event,
        is_saved: this.savedEventApi.isSaved(info.event.id),
      })) || []
  );
  protected readonly sortOptions: MenuOption[] = Object.entries(
    SORT_OPTIONS
  ).map(([value, label]) => ({ value, label }));
  protected readonly selectedSort = computed(
    () => SORT_OPTIONS[this.filterSvc.filters().sort]
  );

  private readonly debouncedQuery = toSignal(
    toObservable(this.navbarSvc.query).pipe(
      debounceTime(250),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  private readonly searchRes = this.eventApi.searchResource(
    () => this.debouncedQuery(),
    () => this.filterSvc.filters()
  );

  protected readonly searchResults = computed<SearchResult<Event>[]>(() =>
    this.searchRes.value().items.map((event) => ({
      label: event.title,
      value: event,
    }))
  );

  protected readonly search: SearchFn<Event> = async (query) => {
    const res = await this.savedEventApi.fetchSavedEvents({
      ...this.filterSvc.filters(),
      query: query,
    });
    return res.items.map((info) => ({
      label: info.event.title,
      value: info.event,
    }));
  };

  constructor() {
    this.navbarSvc.setSearch<Event>({
      placeholder: 'Search events...',
      search: this.search,
      onSelect: (event) => this.selectEvent(event),
    });
  }

  protected onSortSelected(value: string): void {
    this.filterSvc.patch({ sort: value as Sort });
  }

  private selectEvent(result: SearchResult<Event>): void {
    this.router.navigate(['/event', result.value.id]);
  }
}
