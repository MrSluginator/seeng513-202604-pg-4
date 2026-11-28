import { Service, computed, signal } from '@angular/core';
import { DEFAULT_FILTERS, FilterProps } from '../../models/filters';
import { SearchResult } from '../molecules/search-bar/search-bar';
import { Tag } from '../../models/tag.schema';
import { Location } from '../../models/location.schema';

@Service()
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

  addTag(tag: Tag): void {
    if (this._filters().tags.find((t) => t.id === tag.id)) return;
    this._filters().tags.push(tag);
    this.patch({ tags: this._filters().tags });
  }

  removeTag(tag: Tag): void {
    this.patch({ tags: this._filters().tags.filter((t) => t.id !== tag.id) });
  }
}
