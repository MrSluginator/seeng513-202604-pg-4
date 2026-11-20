import { Injectable, computed, signal } from '@angular/core';
import { DEFAULT_FILTERS, FilterProps } from '../../models/filters';
import { SearchResult } from '../molecules/search-bar/search-bar';

@Injectable({ providedIn: 'root' })
export class FilterService {
  private readonly _filters = signal<FilterProps>(DEFAULT_FILTERS);
  private readonly _dialogOpen = signal(false);

  /** The applied filters. Read this from any page to build queries. */
  readonly filters = this._filters.asReadonly();
  readonly dialogOpen = this._dialogOpen.asReadonly();

  /** Number of active filters, handy for a badge on the filter button. */
  readonly activeCount = computed(() => {
    const f = this._filters();
    return (
      f.categories.length +
      f.tags.length +
      Number(!!f.timeRange) +
      Number(!!f.priceRange) +
      Number(!!f.distanceRange)
    );
  });

  openDialog(): void {
    this._dialogOpen.set(true);
  }

  closeDialog(): void {
    this._dialogOpen.set(false);
  }

  apply(filters: FilterProps): void {
    this._filters.set(filters);
  }

  reset(): void {
    this._filters.set(DEFAULT_FILTERS);
  }

  patch(changes: Partial<FilterProps>): void {
    this._filters.update((prev) => ({ ...prev, ...changes }));
  }

  /** For removable tag chips outside the dialog. */
  removeTag(tag: string): void {
    this.patch({ tags: this._filters().tags.filter((t) => t !== tag) });
  }

  queryTags(query: string): SearchResult[] {
    return [];
  }

  queryLocations(query: string): SearchResult[] {
    return [];
  }
}
