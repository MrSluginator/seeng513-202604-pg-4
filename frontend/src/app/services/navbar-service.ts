import { Service, computed, signal } from '@angular/core';
import { SearchResult } from '../molecules/search-bar/search-bar';

export interface NavbarSearchConfig<T> {
  placeholder?: string;
  /** Called reactively with the current query; read any signals you need inside. */
  results: (query: string) => SearchResult<T>[];
  onSelect: (result: SearchResult<T>) => void;
}

/** What the navbar actually stores: the selection logic is baked into each result. */
type NavbarResult = SearchResult<() => void>;

interface ActiveSearch {
  placeholder: string;
  results: (query: string) => NavbarResult[];
}

@Service()
export class NavbarService {
  readonly query = signal('');

  private readonly active = signal<ActiveSearch | null>(null);

  readonly hasSearch = computed(() => this.active() !== null);
  readonly placeholder = computed(
    () => this.active()?.placeholder ?? 'Search...'
  );
  readonly results = computed<NavbarResult[]>(
    () => this.active()?.results(this.query()) ?? []
  );

  readonly signedIn = signal(false);

  setSearch<T>(config: NavbarSearchConfig<T>): void {
    this.query.set('');
    this.active.set({
      placeholder: config.placeholder ?? 'Search...',
      results: (query) =>
        config.results(query).map((result) => ({
          label: result.label,
          value: () => config.onSelect(result),
        })),
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
