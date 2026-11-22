import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, FormsModule } from '@angular/forms';
import { Range } from '../../../models/types';
import { formatTime, number2Time } from '../../../utils/format';
import { FilterService } from '../../services/filter-service';
import { Button } from '../../atoms/button/button';
import { TextInput } from '../../atoms/text-input/text-input';
import { Widget } from '../../atoms/widget/widget';
import {
  RangeFilter,
  RangeFilterValue,
} from '../../molecules/range-filter/range-filter';
import { PinComponent } from '../../atoms/pin/pin';
import { AllCategories } from '../../molecules/category/all-categories';
import { RadioGroupComponent } from '../../atoms/radio-group/radio-group';
import {
  DEFAULT_FILTERS,
  FilterProps,
  Sort,
  SORT_OPTIONS,
} from '../../../models/filters';
import {
  categoriesList,
  CategoryForm,
  CategoryName,
} from '../../molecules/category/categories';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchBar, SearchResult } from '../../molecules/search-bar/search-bar';

const toHours = (d: Date) => d.getHours() + d.getMinutes() / 60;

const toFormValue = (active: readonly CategoryName[]) => {
  const value = {} as Record<CategoryName, boolean>;
  for (const c of categoriesList) value[c] = active.includes(c);
  return value;
};

@Component({
  selector: 'f-filter-dialog',
  imports: [
    FormsModule,
    Button,
    PinComponent,
    Widget,
    AllCategories,
    RadioGroupComponent,
    RangeFilter,
    SearchBar,
  ],
  templateUrl: './filter-dialog.html',
  styleUrl: './filter-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterDialog {
  private readonly filterService = inject(FilterService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly open = this.filterService.dialogOpen;

  // Working copy. Re-seeded from the applied filters every time the dialog
  // opens or closes (so cancelled edits are discarded) and whenever theS
  // applied filters change elsewhere.
  protected readonly draft = linkedSignal<
    { open: boolean; applied: FilterProps },
    FilterProps
  >({
    source: () => ({
      open: this.filterService.dialogOpen(),
      applied: this.filterService.filters(),
    }),
    computation: ({ applied }) => applied,
  });

  protected readonly tagQuery = signal('');
  protected readonly locationQuery = signal('');

  protected tagResults = computed(() =>
    this.filterService.queryTags(this.tagQuery())
  );
  protected locationResults = computed(() =>
    this.filterService.queryLocations(this.tagQuery())
  );

  protected onTagSelected(result: SearchResult): void {
    this.filterService.filters().tags.push(result.label);
  }

  protected onLocationSelected(result: SearchResult): void {
    this.filterService.filters().tags.push(result.label);
  }

  protected readonly sortOptions = Object.entries(SORT_OPTIONS).map(
    ([value, label]) => ({ value, label })
  );

  // RangeFilter works in numbers (null = off); the filters hold Dates/objects
  protected readonly timeValue = computed<RangeFilterValue>(() => {
    const r = this.draft().timeRange;
    return r ? [toHours(r.start), toHours(r.end)] : null;
  });

  protected readonly priceValue = computed<RangeFilterValue>(() => {
    const r = this.draft().priceRange;
    return r ? [r.lowest, r.highest] : null;
  });

  protected readonly distanceValue = computed<RangeFilterValue>(() => {
    const r = this.draft().distanceRange;
    return r ? [r.nearest, r.furthest] : null;
  });

  // Range filter config
  protected readonly timeDefault: Range<number> = [9, 18];
  protected readonly priceDefault: Range<number> = [0, 25];
  protected readonly distanceDefault: Range<number> = [0, 50];

  protected readonly formatHour = (v: number) => formatTime(number2Time(v));
  protected readonly formatPrice = (v: number) => `$ ${v}`;
  protected readonly formatDistance = (v: number) => `${v} km`;

  // Form that f-all-categories binds its toggles to
  protected readonly categoryForm: CategoryForm = (() => {
    const controls = {} as Record<CategoryName, FormControl<boolean>>;
    for (const c of categoriesList) {
      controls[c] = new FormControl(false, { nonNullable: true });
    }
    return new FormGroup(controls);
  })();

  constructor() {
    // Keep the native dialog in sync with the service's open state.
    effect(() => {
      const el = this.dialog()?.nativeElement;
      if (!el) return;

      if (this.open() && !el.open) el.showModal();
      else if (!this.open() && el.open) el.close();
    });

    // draft -> form (emitEvent: false avoids a feedback loop)
    effect(() => {
      this.categoryForm.setValue(toFormValue(this.draft().categories), {
        emitEvent: false,
      });
    });

    // form -> draft
    this.categoryForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const value = this.categoryForm.getRawValue();
      this.patch({ categories: categoriesList.filter((c) => value[c]) });
    });
  }

  // Fires on Escape and on el.close(). Only report closes the user caused;
  // when the service closes us, open() is already false by the time this runs.
  protected onNativeClose(): void {
    if (this.open()) this.filterService.closeDialog();
  }

  // Clicks on the ::backdrop have the <dialog> itself as the target
  protected onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.close();
  }

  protected close(): void {
    this.filterService.closeDialog();
  }

  protected reset(): void {
    this.draft.set(DEFAULT_FILTERS);
  }

  protected apply(): void {
    this.filterService.apply(this.draft());
    this.filterService.closeDialog();
  }

  private patch(changes: Partial<FilterProps>): void {
    this.draft.update((prev) => ({ ...prev, ...changes }));
  }

  protected setSort(sort: Sort): void {
    this.patch({ sort });
  }

  protected removeTag(tag: string): void {
    this.patch({ tags: this.draft().tags.filter((t) => t !== tag) });
  }

  protected setTimeRange(n: RangeFilterValue): void {
    this.patch({
      timeRange: n
        ? { start: number2Time(n[0]), end: number2Time(n[1]) }
        : undefined,
    });
  }

  protected setPriceRange(n: RangeFilterValue): void {
    this.patch({ priceRange: n ? { lowest: n[0], highest: n[1] } : undefined });
  }

  protected setDistanceRange(n: RangeFilterValue): void {
    this.patch({
      distanceRange: n ? { nearest: n[0], furthest: n[1] } : undefined,
    });
  }
}
