import {
  afterNextRender,
  ApplicationRef,
  Component,
  ComponentRef,
  createComponent,
  DestroyRef,
  effect,
  ElementRef,
  EnvironmentInjector,
  inject,
  input,
  model,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { HeatLayer, HeatLatLng } from 'leaflet.heat';
import pinIcon from '../../../assets/icons/pin.svg';
import type { Event } from '../../../models/event.schema';
import { EventPopup } from '../event-popup/event-popup';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

export const DEFAULT_CENTER: L.LatLngTuple = [51.0447, -114.0719];
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

export interface MappedEvent {
  event: Event;
  lat: number;
  lng: number;
}

export interface PopupContext {
  $implicit: Event;
  event: Event;
}

/** Keeps only events that have coordinates. */
export const toMappedEvents = (events: Event[]): MappedEvent[] =>
  events.flatMap((event) => {
    const lat = event.location?.latitude;
    const lng = event.location?.longitude;
    if (lat == null || lng == null) return [];
    return [{ event, lat, lng }];
  });

@Component({
  selector: 'f-event-map',
  templateUrl: './event-map.html',
  styleUrl: './event-map.css',
})
export class EventMap {
  private readonly appRef = inject(ApplicationRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly route = inject(ActivatedRoute);

  /** Events to plot. Ones without coordinates are ignored. */
  readonly events = input<Event[]>([]);
  /** Two-way bindable: set it from outside to select a pin, or react to pin clicks. */
  readonly selectedEventId = model<string | null>(null);
  readonly showHeat = input(true);
  readonly center = input<L.LatLngTuple>(DEFAULT_CENTER);
  readonly zoom = input(DEFAULT_ZOOM);
  readonly showPopup = input(true);
  /** Pan to + open the popup when the selection is changed from outside. */
  readonly focusOnSelect = input(true);
  readonly popupTemplate = input<TemplateRef<PopupContext> | null>(null);

  readonly boundsChange = output<L.LatLngBounds>();

  private readonly mapContainer =
    viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  private map?: L.Map;
  private heatLayer?: HeatLayer & L.Layer;
  private markersLayer?: L.LayerGroup;
  private readonly markersById = new Map<string, L.Marker>();
  private readonly activePopups = new Set<() => void>();
  private lastFocusedId: string | null = null;

  private readonly mapReady = signal(false);

  private readonly eventParam = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('event')))
  );

  constructor() {
    afterNextRender(() => this.initMap());

    effect(() => {
      const id = this.eventParam();
      if (id) this.selectedEventId.set(id);
    });

    // Rebuild heat + markers when the data changes.
    effect(() => {
      if (!this.mapReady()) return;
      const events = toMappedEvents(this.events());
      const showHeat = this.showHeat();
      this.showPopup();
      this.popupTemplate();
      untracked(() => {
        this.syncHeatLayer(events, showHeat);
        this.syncMarkersLayer(events);
      });
    });

    // Highlight / focus the selected pin. Reads events() so it re-runs after
    // markers are rebuilt (e.g. events that arrive after the selection is set).
    effect(() => {
      if (!this.mapReady()) return;
      const selectedId = this.selectedEventId();
      const focus = this.focusOnSelect();
      this.events();
      this.showPopup();
      this.popupTemplate();
      untracked(() => {
        this.updateMarkerHighlight(selectedId);
        if (!selectedId) {
          this.lastFocusedId = null;
          return;
        }
        if (focus && selectedId !== this.lastFocusedId) {
          this.focusEvent(selectedId);
        }
      });
    });
  }

  /** For parents that need the current center (e.g. "near map center" filters). */
  getCenter(): L.LatLng | undefined {
    return this.map?.getCenter();
  }

  focusEvent(id: string): void {
    const marker = this.markersById.get(id);
    if (!this.map || !marker) return;
    this.lastFocusedId = id;
    marker.openPopup();
    this.map.panTo(marker.getLatLng(), { animate: true });
  }

  private initMap(): void {
    const container = this.mapContainer().nativeElement;

    const map = L.map(container, {
      center: this.center(),
      zoom: this.zoom(),
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    this.heatLayer = new HeatLayer([], {
      radius: 30,
      blur: 20,
      minOpacity: 0.35,
      gradient: {
        0.2: '#fded24',
        0.5: '#f8903b',
        0.8: '#e7483a',
        1.0: '#a52114',
      },
    }) as unknown as HeatLayer & L.Layer;
    this.heatLayer.addTo(map);

    this.markersLayer = L.layerGroup().addTo(map);
    this.map = map;

    const updateBounds = () => this.boundsChange.emit(map.getBounds());
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

  private syncHeatLayer(events: MappedEvent[], show: boolean): void {
    if (!this.heatLayer) return;
    if (!show) {
      this.heatLayer.setLatLngs([]);
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

      if (this.showPopup()) {
        marker.bindPopup(() => this.createPopupContent(event, marker));
      }
      marker.on('click', () => {
        // Selection came from the map itself, so don't pan.
        this.lastFocusedId = event.id;
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
    const template = this.popupTemplate();
    let element: HTMLElement;
    let destroy: () => void;

    if (template) {
      const viewRef = template.createEmbeddedView({ $implicit: event, event });
      this.appRef.attachView(viewRef);
      viewRef.detectChanges();

      // Leaflet needs a single element, and templates can have several root nodes.
      element = document.createElement('div');
      element.append(...viewRef.rootNodes);

      destroy = () => {
        this.appRef.detachView(viewRef);
        viewRef.destroy();
      };
    } else {
      const componentRef = createComponent(EventPopup, {
        environmentInjector: this.environmentInjector,
      });
      componentRef.setInput('event', event);
      this.appRef.attachView(componentRef.hostView);
      componentRef.changeDetectorRef.detectChanges();

      element = componentRef.location.nativeElement as HTMLElement;

      destroy = () => {
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
      };
    }

    this.activePopups.add(destroy);

    const cleanup = () => {
      marker.off('popupclose', cleanup);
      marker.off('remove', cleanup);
      if (!this.activePopups.delete(destroy)) return;
      destroy();
    };
    marker.on('popupclose', cleanup);
    marker.on('remove', cleanup);

    return element;
  }

  private destroyActivePopups(): void {
    for (const destroy of this.activePopups) destroy();
    this.activePopups.clear();
  }
}
