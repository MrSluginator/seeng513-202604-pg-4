import { Service, TemplateRef, computed, signal } from '@angular/core';
import {
  SearchFn,
  SearchResult,
  SearchResultContext,
} from '../molecules/search-bar/search-bar';
import { of } from 'rxjs';

export interface NavbarSearchConfig<T> {
  placeholder?: string;
  search: SearchFn<T>;
  relatedSearch?: SearchFn<T>;
  resultTemplate?: TemplateRef<SearchResultContext<T>>;
  onSelect: (result: SearchResult<T>) => void;
}

/** What the navbar actually stores: the selection logic is baked into each result. */
type NavbarResult = SearchResult<() => void>;

interface ActiveSearchConfig {
  placeholder: string;
  search: SearchFn<unknown>;
  relatedSearch?: SearchFn<unknown>;
  resultTemplate?: TemplateRef<SearchResultContext<unknown>>;
  onSelect: (result: SearchResult<unknown>) => void;
}

@Service()
export class NavbarService {
  readonly query = signal('');
  readonly active = signal<ActiveSearchConfig | null>(null);

  readonly hasSearch = computed(() => this.active() !== null);
  readonly placeholder = computed(
    () => this.active()?.placeholder ?? 'Search...'
  );

  readonly signedIn = signal(false);

  setSearch<T>(config: NavbarSearchConfig<T>): void {
    this.query.set('');
    this.active.set({
      placeholder: config.placeholder ?? 'Search...',
      search: config.search as SearchFn<unknown>,
      relatedSearch: (config.relatedSearch ??
        (() => of([]))) as SearchFn<unknown>,
      resultTemplate: config.resultTemplate as
        TemplateRef<SearchResultContext<unknown>> | undefined,
      onSelect: (result) => config.onSelect(result as SearchResult<T>),
    });
  }

  clearSearch(): void {
    this.active.set(null);
    this.query.set('');
  }

  select(result: NavbarResult): void {
    result.value();
  }
}
