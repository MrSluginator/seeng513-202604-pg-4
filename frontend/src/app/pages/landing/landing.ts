import { Sort } from './../../../models/filters';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
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
import { NavbarService } from '../../services/navbar-service';
import {
  SearchResult,
  SearchBar,
  SearchFn,
} from '../../molecules/search-bar/search-bar';
import { Footer } from '../../components/footer/footer';
import { AllCategories } from '../../molecules/category/all-categories';
import {
  categoriesList,
  CategoryForm,
  CategoryName,
} from '../../molecules/category/categories';
import { Event } from '../../../models/event.schema';

@Component({
  imports: [
    EventGrid,
    FilterButton,
    Widget,
    Divider,
    MenuButton,
    SearchBar,
    Footer,
    AllCategories,
  ],
  selector: 'f-landing',
  styleUrl: './landing.css',
  templateUrl: './landing.html',
})
export class Landing {
  private readonly filterSvc = inject(FilterService);
  private readonly eventApi = inject(EventService);
  private readonly navbarSvc = inject(NavbarService);
  private readonly router = inject(Router);

  protected readonly featured = this.eventApi.getFeatured();
  protected readonly feed = this.eventApi.getEventFeed(this.filterSvc.filters);
  private readonly feedSection =
    viewChild.required<ElementRef<HTMLElement>>('feedSection');

  protected readonly sortOptions: MenuOption[] = Object.entries(
    SORT_OPTIONS
  ).map(([value, label]) => ({ value, label }));

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

  protected readonly search: SearchFn<Event> = async (query) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [];
  };

  protected readonly categoryForm: CategoryForm = (() => {
    const selected = new Set(this.filterSvc.filters().categories);
    const controls = {} as Record<CategoryName, FormControl<boolean>>;
    for (const c of categoriesList) {
      controls[c] = new FormControl(selected.has(c), { nonNullable: true });
    }
    return new FormGroup(controls);
  })();

  constructor() {
    // form -> filters
    this.categoryForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const raw = this.categoryForm.getRawValue();
      const categories = categoriesList.filter((c) => raw[c]);
      this.filterSvc.patch({ categories });
      this.scrollToFeed();
    });

    // filters -> form (so the filter dialog or reset() updates the chips too)
    effect(() => {
      const selected = new Set(this.filterSvc.filters().categories);
      const value = {} as Record<CategoryName, boolean>;
      for (const c of categoriesList) value[c] = selected.has(c);
      this.categoryForm.setValue(value, { emitEvent: false });
    });

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

  private scrollToFeed(): void {
    this.feedSection().nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
