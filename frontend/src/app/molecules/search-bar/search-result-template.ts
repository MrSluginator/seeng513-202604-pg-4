import { Directive, TemplateRef, inject, input } from '@angular/core';
import type { SearchFn, SearchResultContext } from './search-bar.types';

/**
 * Marks the template used to render each result inside <f-search-bar>.
 *
 * Optionally bind the search function you pass to the search bar. It's only
 * used so the template's `let-result` is typed as SearchResult<T>:
 *
 *   <ng-template [fSearchResult]="searchUsers" let-user>{{ user.value.name }}</ng-template>
 */
@Directive({ selector: 'ng-template[fSearchResult]' })
export class SearchResultTemplate<T> {
  readonly template = inject<TemplateRef<SearchResultContext<T>>>(TemplateRef);

  /** Type witness only; never read at runtime. */
  readonly fSearchResult = input<SearchFn<T> | ''>('');

  static ngTemplateContextGuard<T>(
    _dir: SearchResultTemplate<T>,
    _ctx: unknown
  ): _ctx is SearchResultContext<T> {
    return true;
  }
}
