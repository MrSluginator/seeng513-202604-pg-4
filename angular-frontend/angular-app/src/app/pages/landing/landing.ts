import { Sort } from './../../../models/filters';
import { Component, computed, inject, signal } from '@angular/core';
import { EventGrid } from '../../components/event-grid/event-grid';
import { FilterService } from '../../services/filter-service';
import { FilterButton } from '../../molecules/filter-button/filter-button';
import { Widget } from '../../atoms/widget/widget';
import { EventService } from '../../services/api-service';
import { Divider } from '../../atoms/divider/divider';
import {
  MenuButton,
  MenuOption,
} from '../../molecules/menu-button/menu-button';
import { SORT_OPTIONS } from '../../../models/filters';
import { Button } from '../../atoms/button/button';
import { NavbarService } from '../../services/navbar-service';
import { SearchResult, SearchBar } from '../../molecules/search-bar/search-bar';

@Component({
  imports: [
    EventGrid,
    FilterButton,
    Widget,
    Divider,
    MenuButton,
    Button,
    SearchBar,
  ],
  selector: 'f-landing',
  styleUrl: './landing.css',
  templateUrl: './landing.html',
})
export class Landing {
  private readonly filterSvc = inject(FilterService);
  private readonly eventApi = inject(EventService);
  private readonly navbarSvc = inject(NavbarService);

  protected readonly featured = this.eventApi.getFeatured();
  protected readonly feed = this.eventApi.getEventFeed(this.filterSvc.filters);

  protected readonly sortOptions: MenuOption[] = Object.entries(
    SORT_OPTIONS
  ).map(([value, label]) => ({ value, label }));

  protected onSortSelected(value: string): void {
    this.filterSvc.patch({ sort: value as Sort });
  }

  printFilters() {
    console.log(this.filterSvc.filters());
  }

  protected searchEvents(query: string): SearchResult<Event>[] {
    return [];
  }

  protected selectEvent(event: SearchResult<Event>): void {
    return;
  }

  protected eventQuery = signal<string>('');
  protected eventResults = computed(() => this.searchEvents(this.eventQuery()));

  constructor() {
    this.navbarSvc.setSearch<Event>({
      placeholder: 'Search events...',
      results: (query) => this.searchEvents(query),
      onSelect: (event) => this.selectEvent(event),
    });
  }
}
