import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  Resource,
  ResourceStatus,
  computed,
  contentChild,
  debounced,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { from } from 'rxjs';
import { TextInput } from '../../atoms/text-input/text-input';
import type { SearchFn, SearchResult } from './search-bar.types';
import { SearchResultTemplate } from './search-result-template';

export type {
  SearchFn,
  SearchResult,
  SearchResultContext,
  SearchResultGroup,
} from './search-bar.types';
export { SearchResultTemplate };

// OnPush is the default change detection strategy in Angular 22.
@Component({
  selector: 'f-search-bar',
  imports: [FormsModule, NgTemplateOutlet, TextInput],
  styleUrl: './search-bar.css',
  templateUrl: './search-bar.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close()',
    '[attr.data-menu-align]': 'menuAlign()',
  },
})
export class SearchBar<T> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // API
  readonly placeholder = input('Search...');
  readonly menuTitle = input('Search Tags');
  readonly directLabel = input('Direct Matches');
  readonly relatedLabel = input('Related Matches');
  readonly debounceMs = input(200);
  readonly search = input.required<SearchFn<T>>();
  readonly relatedSearch = input<SearchFn<T> | undefined>();
  readonly query = model('');
  readonly resultSelected = output<SearchResult<T>>();
  readonly submitted = output<string>();
  readonly menuAlign = input<'start' | 'end'>('end');
  /** Optional `<ng-template fSearchResult let-result>` that renders each result. */
  protected readonly resultTemplate =
    contentChild<SearchResultTemplate<T>>(SearchResultTemplate);

  // Both searches share one debounced query. Clearing the box applies
  // immediately, since a wait function that returns nothing skips the timer.
  // NOTE: `debounced` is experimental in Angular 22.
  private readonly debouncedQuery = debounced(
    () => this.query().trim(),
    (q) =>
      q
        ? new Promise<void>((resolve) => setTimeout(resolve, this.debounceMs()))
        : undefined
  );

  // An empty term leaves the resources idle. rxResource unsubscribes from
  // the in-flight request whenever the term changes.
  private readonly term = computed(
    () => this.debouncedQuery.value() || undefined
  );

  private readonly directResource = rxResource({
    params: () => this.term(),
    stream: ({ params }) => from(this.search()(params)),
  });
  private readonly relatedResource = rxResource({
    params: () => {
      const fn = this.relatedSearch();
      const q = this.term();
      return fn && q ? { fn, q } : undefined;
    },
    stream: ({ params }) => from(params.fn(params.q)),
  });

  // Derived results
  protected readonly directResults = this.latest(this.directResource);
  private readonly relatedLatest = this.latest(this.relatedResource);
  protected readonly relatedResults = computed(() => {
    // Don't repeat a tag that's already shown as a direct match.
    const seen = new Set(this.directResults().map((r) => r.label));
    return this.relatedLatest().filter((r) => !seen.has(r.label));
  });
  /** Flat list in visual order, used for keyboard navigation. */
  protected readonly ordered = computed(() => [
    ...this.directResults(),
    ...this.relatedResults(),
  ]);
  protected readonly loading = computed(
    () =>
      this.debouncedQuery.isLoading() ||
      this.directResource.isLoading() ||
      this.relatedResource.isLoading()
  );

  // Internal UI state
  protected readonly isOpen = signal(false);
  /** Resets to -1 whenever the results change, so Enter never picks an unseen tag. */
  protected readonly activeIndex = linkedSignal({
    source: this.ordered,
    computation: () => -1,
  });
  protected readonly showMenu = computed(
    () => this.isOpen() && this.query().trim().length > 0
  );

  /**
   * Keeps the previous results on screen while the next ones load. Empty,
   * failed and idle resources yield no results.
   */
  private latest(resource: Resource<SearchResult<T>[] | undefined>) {
    return linkedSignal<
      { status: ResourceStatus; value: SearchResult<T>[] | undefined },
      SearchResult<T>[]
    >({
      source: () => ({
        status: resource.status(),
        value: resource.hasValue() ? resource.value() : undefined,
      }),
      computation: ({ status, value }, previous) =>
        status === 'loading' ? (previous?.value ?? []) : (value ?? []),
    });
  }

  protected open(): void {
    this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  protected onQueryChange(value: string): void {
    this.query.set(value);
    this.open();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.ordered().length;
    switch (event.key) {
      // Tags wrap across rows, so left/right and up/down both step through them.
      case 'ArrowDown':
      case 'ArrowRight':
        if (count === 0) return;
        event.preventDefault();
        this.open();
        this.activeIndex.update((i) => (i + 1) % count);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        if (count === 0) return;
        event.preventDefault();
        this.activeIndex.update((i) => (i <= 0 ? count - 1 : i - 1));
        break;
      case 'Enter': {
        event.preventDefault();
        const result = this.ordered()[this.activeIndex()];
        if (result) {
          this.select(result);
        } else {
          const trimmed = this.query().trim();
          if (trimmed) {
            this.submitted.emit(trimmed);
            this.close();
          }
        }
        break;
      }
    }
  }

  protected select(result: SearchResult<T>): void {
    this.resultSelected.emit(result);
    this.query.set('');
    this.close();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
