import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import type * as L from 'leaflet';
import { EventCard } from '../../components/event-card/event-card';
import {
  DEFAULT_CENTER,
  EventMap,
  MappedEvent,
  toMappedEvents,
} from '../../components/event-map/event-map';
import { AllCategories } from '../../molecules/category/all-categories';
import { FilterButton } from '../../molecules/filter-button/filter-button';
import {
  categoriesList,
  CategoryForm,
  CategoryName,
} from '../../molecules/category/categories';
import { EventService } from '../../services/event-service';
import { FilterService } from '../../services/filter-service';

@Component({
  imports: [EventCard, AllCategories, FilterButton, EventMap],
  selector: 'f-heat-map',
  styleUrl: './heat-map.css',
  templateUrl: './heat-map.html',
})
export class HeatMap {
  private readonly eventApi = inject(EventService);
  private readonly filterSvc = inject(FilterService);

  private readonly eventMap = viewChild(EventMap);
  private readonly sidebarList =
    viewChild<ElementRef<HTMLDivElement>>('sidebarList');

  protected readonly viewBounds = signal<L.LatLngBounds | null>(null);
  protected readonly selectedEventId = signal<string | null>(null);

  private readonly effectiveFilters = computed(() => {
    const f = this.filterSvc.filters();
    const needsLocation = Boolean(f.distanceRange) || f.sort === 'distance';
    if (!needsLocation || f.locations.length > 0) return f;

    const center = this.eventMap()?.getCenter();
    const latitude = center?.lat ?? DEFAULT_CENTER[0];
    const longitude = center?.lng ?? DEFAULT_CENTER[1];
    return {
      ...f,
      locations: [{ name: 'Map center', latitude, longitude }],
    };
  });

  protected readonly feed = this.eventApi.listEvents(this.effectiveFilters);

  protected readonly events = computed(() => {
    console.log(this.feed.value());
    return this.feed.hasValue() ? this.feed.value().items : [];
  });

  protected readonly categoryForm: CategoryForm = (() => {
    const selected = new Set(this.filterSvc.filters().categories);
    const controls = {} as Record<CategoryName, FormControl<boolean>>;
    for (const c of categoriesList) {
      controls[c] = new FormControl(selected.has(c), { nonNullable: true });
    }
    return new FormGroup(controls);
  })();

  protected readonly mappedEvents = computed(() =>
    toMappedEvents(this.events())
  );

  protected readonly visibleEvents = computed<MappedEvent[]>(() => {
    const bounds = this.viewBounds();
    const events = this.mappedEvents();
    if (!bounds) return events;
    return events.filter(({ lat, lng }) => bounds.contains([lat, lng]));
  });

  constructor() {
    this.categoryForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const raw = this.categoryForm.getRawValue();
      const categories = categoriesList.filter((c) => raw[c]);
      this.filterSvc.patch({ categories });
    });

    effect(() => {
      const selected = new Set(this.filterSvc.filters().categories);
      const value = {} as Record<CategoryName, boolean>;
      for (const c of categoriesList) value[c] = selected.has(c);
      this.categoryForm.setValue(value, { emitEvent: false });
    });

    effect(() => {
      const selectedId = this.selectedEventId();
      if (selectedId) this.scrollSelectedCardIntoView(selectedId);
    });
  }

  protected focusEvent(item: MappedEvent): void {
    this.selectedEventId.set(item.event.id);
    this.eventMap()?.focusEvent(item.event.id);
  }

  private scrollSelectedCardIntoView(eventId: string): void {
    const listEl = this.sidebarList()?.nativeElement;
    if (!listEl) return;

    listEl
      .querySelector<HTMLElement>(`[data-event-id="${CSS.escape(eventId)}"]`)
      ?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
  }
}
