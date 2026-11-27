import { Observable } from 'rxjs';

export interface SearchResult<T> {
  label: string;
  value: T;
}

/** Works with HttpClient observables or plain promises. */
export type SearchFn<T> = (
  query: string
) => Observable<SearchResult<T>[]> | Promise<SearchResult<T>[]>;

export type SearchResultGroup = 'direct' | 'related';

/** What a custom result template receives. */
export interface SearchResultContext<T> {
  /** The result being rendered: `let-result`. */
  $implicit: SearchResult<T>;
  /** Which section it's in: `let-group="group"`. */
  group: SearchResultGroup;
  /** True while the result is highlighted by the keyboard: `let-active="active"`. */
  active: boolean;
}
