import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '../../atoms/button/button';
import { Divider } from '../../atoms/divider/divider';
import { Widget } from '../../atoms/widget/widget';
import { EventGrid } from '../../components/event-grid/event-grid';
import { Footer } from '../../components/footer/footer';
import { FilterButton } from '../../molecules/filter-button/filter-button';
import {
  MenuButton,
  MenuOption,
} from '../../molecules/menu-button/menu-button';
import { EventService } from '../../services/api-service';
import { FilterService } from '../../services/filter-service';
import { Event } from '../../../models/event.schema';
import { FilterProps, Sort, SORT_OPTIONS } from '../../../models/filters';

type SearchSort = 'relevance' | Sort;

function scoreEventRelevance(event: Event, rawQuery: string): number {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return 0;

  const title = event.title.toLowerCase();
  const summary = (event.summary ?? '').toLowerCase();
  const location = (event.location?.name ?? '').toLowerCase();
  const tagText = event.tags
    .map((t) => `${t.name} ${t.slug}`.toLowerCase())
    .join(' ');

  let score = 0;

  if (title === query) {
    score += 100;
  } else if (title.startsWith(query)) {
    score += 70;
  } else if (title.includes(query)) {
    score += 50;
  }

  if (tagText.includes(query)) score += 35;
  if (summary.includes(query)) score += 25;
  if (location.includes(query)) score += 20;

  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length > 1) {
    for (const term of terms) {
      if (title.includes(term)) score += 15;
      if (tagText.includes(term)) score += 10;
      if (summary.includes(term)) score += 6;
      if (location.includes(term)) score += 5;
    }
  }

  return score;
}

@Component({
  selector: 'f-search',
  imports: [
    EventGrid,
    FilterButton,
    MenuButton,
    Widget,
    Divider,
    Button,
    Footer,
  ],
  templateUrl: './search.html',
  styleUrl: './search.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Search {
  private readonly eventApi = inject(EventService);
  protected readonly filterSvc = inject(FilterService);
  private readonly router = inject(Router);

  /** Bound automatically from ?q=... in the URL via withComponentInputBinding(). */
  readonly q = input('', {
    transform: (value: string | undefined) => value ?? '',
  });

  /** Bound automatically from ?tag=... in the URL (e.g. clicking a tag on an event card). */
  readonly tag = input('', {
    transform: (value: string | undefined) => value ?? '',
  });

  protected readonly trimmedQuery = computed(() => this.q().trim());
  protected readonly trimmedTag = computed(() => this.tag().trim());

  protected readonly selectedSort = signal<SearchSort>('relevance');

  protected readonly sortOptions: MenuOption[] = [
    { value: 'relevance', label: 'Best Match' },
    ...Object.entries(SORT_OPTIONS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  protected readonly sortLabel = computed(() => {
    const current = this.selectedSort();
    if (current === 'relevance') return 'Best Match';
    return SORT_OPTIONS[current];
  });

  private readonly effectiveFilters = computed<FilterProps>(() => {
    const base = this.filterSvc.filters();
    const urlTag = this.trimmedTag();
    const tags =
      urlTag && !base.tags.some((t) => t.slug === urlTag || t.name === urlTag)
        ? [
            ...base.tags,
            { id: urlTag, name: urlTag, slug: urlTag.toLowerCase() },
          ]
        : base.tags;

    const sortChoice = this.selectedSort();
    return {
      ...base,
      tags,
      query: this.trimmedQuery() || undefined,
      sort: sortChoice === 'relevance' ? base.sort : sortChoice,
      limit: 50,
      offset: 0,
    };
  });

  protected readonly searchResults = this.eventApi.getEventFeed(
    this.effectiveFilters
  );

  protected readonly events = computed<Event[]>(() => {
    const items = this.searchResults.hasValue()
      ? this.searchResults.value().items
      : [];
    const query = this.trimmedQuery();

    if (!query || this.selectedSort() !== 'relevance') {
      return items;
    }

    return [...items].sort((a, b) => {
      const diff =
        scoreEventRelevance(b, query) - scoreEventRelevance(a, query);
      if (diff !== 0) return diff;
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return b.visits_count - a.visits_count;
    });
  });

  protected readonly totalCount = computed(() =>
    this.searchResults.hasValue() ? this.searchResults.value().total : 0
  );

  protected onSortSelected(value: string): void {
    const sort = value as SearchSort;
    this.selectedSort.set(sort);
    if (sort !== 'relevance') {
      this.filterSvc.patch({ sort });
    }
  }

  protected clearSearch(): void {
    this.filterSvc.reset();
    this.selectedSort.set('relevance');
    this.router.navigate(['/search']);
  }

  protected browseAll(): void {
    this.router.navigate(['/']);
  }
}
