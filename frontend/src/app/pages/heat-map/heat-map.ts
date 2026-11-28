import {
  afterNextRender,
  ApplicationRef,
  Component,
  ComponentRef,
  computed,
  createComponent,
  DestroyRef,
  effect,
  ElementRef,
  EnvironmentInjector,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import * as L from 'leaflet';
import { HeatLayer, HeatLatLng } from 'leaflet.heat';
import pinIcon from '../../../assets/icons/pin.svg';
import type { Event } from '../../../models/event.schema';
import type {
  HeatPoint,
  HeatmapResponse,
} from '../../../models/heatmap.schema';
import { formatTime, number2Time } from '../../../utils/format';
import { EventCard } from '../../components/event-card/event-card';
import { EventPopup } from '../../components/event-popup/event-popup';
import { AllCategories } from '../../molecules/category/all-categories';
import { FilterButton } from '../../molecules/filter-button/filter-button';
import { TimeSlider } from '../../molecules/time-slider/time-slider';
import {
  categoriesList,
  CategoryForm,
  CategoryName,
} from '../../molecules/category/categories';
import { AuthService } from '../../services/auth-service';
import { EventService } from '../../services/event-service';
import { FilterService } from '../../services/filter-service';

const DEFAULT_CENTER: L.LatLngTuple = [51.0447, -114.0719];
const DEFAULT_ZOOM = 12;

const PIN_ICON_SIZE: L.PointTuple = [28, 28];
const SELECTED_PIN_ICON_SIZE: L.PointTuple = [36, 36];

const createPinIcon = (selected: boolean): L.DivIcon => {
  const [width, height] = selected ? SELECTED_PIN_ICON_SIZE : PIN_ICON_SIZE;
  return L.divIcon({
    className: selected ? 'event-pin-marker selected' : 'event-pin-marker',
    html: pinIcon,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
  });
};

const DEFAULT_MARKER_ICON = createPinIcon(false);
const SELECTED_MARKER_ICON = createPinIcon(true);

interface MappedEvent {
  event: Event;
  lat: number;
  lng: number;
}

@Component({
  imports: [EventCard, AllCategories, FilterButton, TimeSlider],
  selector: 'f-heat-map',
  styleUrl: './heat-map.css',
  templateUrl: './heat-map.html',
})
export class HeatMap {
  private readonly appRef = inject(ApplicationRef);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly eventApi = inject(EventService);
  private readonly filterSvc = inject(FilterService);

  private readonly mapContainer =
    viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private readonly sidebarList =
    viewChild<ElementRef<HTMLDivElement>>('sidebarList');

  private map?: L.Map;
  private heatLayer?: HeatLayer & L.Layer;
  private markersLayer?: L.LayerGroup;
  private readonly markersById = new Map<string, L.Marker>();
  private readonly activePopups = new Map<string, ComponentRef<EventPopup>>();

  private readonly mapReady = signal(false);
  private readonly viewBounds = signal<L.LatLngBounds | null>(null);
  protected readonly selectedEventId = signal<string | null>(null);

  protected readonly selectedHour = signal<number>(new Date().getHours());
  private readonly formattedSelectedHour = computed(() =>
    formatTime(number2Time(this.selectedHour()))
  );

  private readonly effectiveFilters = computed(() => {
    const f = this.filterSvc.filters();
    const needsLocation = Boolean(f.distanceRange) || f.sort === 'distance';
    if (!needsLocation || f.locations.length > 0) return f;

    const center = this.map?.getCenter();
    const latitude = center?.lat ?? DEFAULT_CENTER[0];
    const longitude = center?.lng ?? DEFAULT_CENTER[1];
    return {
      ...f,
      locations: [{ name: 'Map center', latitude, longitude }],
    };
  });

  private readonly hasActiveFilters = computed(() => {
    const f = this.filterSvc.filters();
    return Boolean(this.filterSvc.activeCount() > 0 || f.query?.trim());
  });

  protected readonly feed = this.eventApi.listEvents(this.effectiveFilters);
  protected readonly heatmap = this.eventApi.getHeatmap(() => ({
    hour: this.selectedHour(),
    limit: 500,
  }));
  private readonly lastHeatmap = signal<HeatmapResponse | null>(null);

  protected readonly heatmapAuthRequired = computed(() => {
    const err = this.heatmap.error();
    return err instanceof HttpErrorResponse && err.status === 401;
  });

  private readonly busynessByEventId = computed(() => {
    const data = this.lastHeatmap();
    const map = new Map<string, HeatPoint>();
    if (!data) return map;
    for (const point of data.points) {
      map.set(point.event_id, point);
    }
    return map;
  });

  protected readonly categoryForm: CategoryForm = (() => {
    const selected = new Set(this.filterSvc.filters().categories);
    const controls = {} as Record<CategoryName, FormControl<boolean>>;
    for (const c of categoriesList) {
      controls[c] = new FormControl(selected.has(c), { nonNullable: true });
    }
    return new FormGroup(controls);
  })();

  protected readonly mappedEvents = computed<MappedEvent[]>(() => {
    const items = this.feed.hasValue() ? this.feed.value().items : [];
    return items.flatMap((event) => {
      const lat = event.location?.latitude;
      const lng = event.location?.longitude;
      if (lat == null || lng == null) return [];
      return [{ event, lat, lng }];
    });
  });

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

    afterNextRender(() => {
      this.initMap();
    });

    effect(() => {
      if (this.auth.token()) {
        this.heatmap.reload();
      }
    });

    effect(() => {
      if (this.heatmap.hasValue()) {
        this.lastHeatmap.set(this.heatmap.value());
      }
    });

    effect(() => {
      if (!this.mapReady() || !this.map) return;

      const events = this.mappedEvents();
      this.syncMarkersLayer(events);
      this.updateMarkerHighlight(this.selectedEventId());
    });

    effect(() => {
      if (!this.mapReady() || !this.map) return;

      const events = this.mappedEvents();
      const heatmapData = this.lastHeatmap();
      this.syncHeatLayer(events, heatmapData);
      this.syncActivePopupBusyness();
    });

    effect(() => {
      const selectedId = this.selectedEventId();
      this.updateMarkerHighlight(selectedId);
      if (selectedId) {
        this.scrollSelectedCardIntoView(selectedId);
      }
    });
  }

  protected focusEvent(item: MappedEvent): void {
    if (!this.map) return;

    this.selectedEventId.set(item.event.id);
    this.map.panTo([item.lat, item.lng], { animate: true });

    const marker = this.markersById.get(item.event.id);
    if (marker) {
      marker.openPopup();
    }
  }

  private initMap(): void {
    const container = this.mapContainer().nativeElement;

    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    this.heatLayer = new HeatLayer([], {
      radius: 35,
      blur: 22,
      max: 1.0,
      maxZoom: 1,
      minOpacity: 0.05,
      gradient: {
        0.2: '#fded24',
        0.5: '#f8903b',
        0.75: '#e7483a',
        1.0: '#a52114',
      },
    }) as unknown as HeatLayer & L.Layer;
    this.heatLayer.addTo(map);

    this.markersLayer = L.layerGroup().addTo(map);
    this.map = map;

    const updateBounds = () => {
      this.viewBounds.set(map.getBounds());
    };
    map.on('moveend zoomend resize', updateBounds);
    updateBounds();

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });
    resizeObserver.observe(container);

    this.mapReady.set(true);

    this.destroyRef.onDestroy(() => {
      resizeObserver.disconnect();
      this.destroyActivePopups();
      map.off('moveend zoomend resize', updateBounds);
      map.remove();
      this.map = undefined;
      this.heatLayer = undefined;
      this.markersLayer = undefined;
      this.markersById.clear();
    });
  }

  private syncHeatLayer(
    events: MappedEvent[],
    heatmapData: HeatmapResponse | null
  ): void {
    if (!this.heatLayer) return;

    if (heatmapData) {
      let heatPoints = heatmapData.points;
      if (this.hasActiveFilters()) {
        const allowedIds = new Set(events.map(({ event }) => event.id));
        heatPoints = heatPoints.filter((point) =>
          allowedIds.has(point.event_id)
        );
      }
      const points: HeatLatLng[] = heatPoints.map((point) => [
        point.latitude,
        point.longitude,
        point.intensity,
      ]);
      this.heatLayer.setLatLngs(points);
      return;
    }

    const maxVisits = Math.max(
      1,
      ...events.map(({ event }) => event.visits_count)
    );
    const points: HeatLatLng[] = events.map(({ event, lat, lng }) => [
      lat,
      lng,
      Math.max(0.3, event.visits_count / maxVisits),
    ]);

    this.heatLayer.setLatLngs(points);
  }

  private syncMarkersLayer(events: MappedEvent[]): void {
    if (!this.markersLayer) return;

    this.destroyActivePopups();
    this.markersLayer.clearLayers();
    this.markersById.clear();

    for (const { event, lat, lng } of events) {
      const marker = L.marker([lat, lng], { icon: DEFAULT_MARKER_ICON });

      marker.bindPopup(() => this.createPopupContent(event, marker));
      marker.on('click', () => {
        this.selectedEventId.set(event.id);
      });
      marker.addTo(this.markersLayer);
      this.markersById.set(event.id, marker);
    }
  }

  private updateMarkerHighlight(selectedId: string | null): void {
    for (const [id, marker] of this.markersById) {
      if (id === selectedId) {
        marker.setIcon(SELECTED_MARKER_ICON);
        marker.setZIndexOffset(1000);
      } else {
        marker.setIcon(DEFAULT_MARKER_ICON);
        marker.setZIndexOffset(0);
      }
    }
  }

  private createPopupContent(event: Event, marker: L.Marker): HTMLElement {
    const componentRef = createComponent(EventPopup, {
      environmentInjector: this.environmentInjector,
    });
    componentRef.setInput('event', event);
    this.applyPopupBusyness(event.id, componentRef);
    this.appRef.attachView(componentRef.hostView);
    componentRef.changeDetectorRef.detectChanges();
    this.activePopups.set(event.id, componentRef);

    const cleanup = () => {
      marker.off('popupclose', cleanup);
      marker.off('remove', cleanup);
      if (this.activePopups.get(event.id) !== componentRef) return;
      this.activePopups.delete(event.id);
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();
    };
    marker.on('popupclose', cleanup);
    marker.on('remove', cleanup);

    return componentRef.location.nativeElement as HTMLElement;
  }

  private applyPopupBusyness(
    eventId: string,
    componentRef: ComponentRef<EventPopup>
  ): void {
    const heatmapData = this.lastHeatmap();
    if (!heatmapData) {
      componentRef.setInput('busyness', null);
      componentRef.setInput('busynessTime', null);
      return;
    }
    const point = this.busynessByEventId().get(eventId);
    componentRef.setInput('busyness', point ? point.intensity : 0);
    componentRef.setInput('busynessTime', this.formattedSelectedHour());
  }

  private syncActivePopupBusyness(): void {
    for (const [eventId, ref] of this.activePopups) {
      this.applyPopupBusyness(eventId, ref);
      ref.changeDetectorRef.detectChanges();
    }
  }

  private scrollSelectedCardIntoView(eventId: string): void {
    const listEl = this.sidebarList()?.nativeElement;
    if (!listEl) return;

    const card = listEl.querySelector<HTMLElement>(
      `[data-event-id="${CSS.escape(eventId)}"]`
    );
    card?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }

  private destroyActivePopups(): void {
    for (const ref of this.activePopups.values()) {
      this.appRef.detachView(ref.hostView);
      ref.destroy();
    }
    this.activePopups.clear();
  }
}
