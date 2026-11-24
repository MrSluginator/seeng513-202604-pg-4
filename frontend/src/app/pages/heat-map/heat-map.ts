import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { HeatLayer, HeatLatLng } from 'leaflet.heat';
import type { Event } from '../../../models/event.schema';
import { EventService } from '../../services/api-service';
import { FilterService } from '../../services/filter-service';

const DEFAULT_CENTER: L.LatLngTuple = [51.0447, -114.0719];
const DEFAULT_ZOOM = 12;

interface MappedEvent {
  event: Event;
  lat: number;
  lng: number;
}

@Component({
  imports: [],
  selector: 'f-heat-map',
  styleUrl: './heat-map.css',
  templateUrl: './heat-map.html',
})
export class HeatMap {
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventApi = inject(EventService);
  private readonly filterSvc = inject(FilterService);
  private readonly router = inject(Router);

  private readonly mapContainer =
    viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  private map?: L.Map;
  private heatLayer?: HeatLayer & L.Layer;
  private markersLayer?: L.LayerGroup;

  private readonly mapReady = signal(false);
  protected readonly showHeatmap = signal(true);
  protected readonly showPins = signal(true);

  protected readonly feed = this.eventApi.getEventFeed(this.filterSvc.filters);

  protected readonly mappedEvents = computed<MappedEvent[]>(() =>
    this.feed.value().items.flatMap((event) => {
      const lat = event.location?.latitude;
      const lng = event.location?.longitude;
      if (lat == null || lng == null) return [];
      return [{ event, lat, lng }];
    })
  );

  constructor() {
    afterNextRender(() => {
      this.initMap();
    });

    effect(() => {
      if (!this.mapReady() || !this.map) return;

      const events = this.mappedEvents();
      const showHeat = this.showHeatmap();
      const showPins = this.showPins();

      this.syncHeatLayer(events, showHeat);
      this.syncMarkersLayer(events, showPins);
    });
  }

  protected toggleHeatmap(): void {
    this.showHeatmap.update((v) => !v);
  }

  protected togglePins(): void {
    this.showPins.update((v) => !v);
  }

  protected recenter(): void {
    if (!this.map) return;

    const events = this.mappedEvents();
    if (events.length > 0) {
      const bounds = L.latLngBounds(
        events.map(({ lat, lng }) => [lat, lng] as L.LatLngTuple)
      );
      this.map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
    } else {
      this.map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
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

    this.markersLayer = L.layerGroup();
    this.map = map;
    this.mapReady.set(true);

    this.destroyRef.onDestroy(() => {
      map.remove();
      this.map = undefined;
      this.heatLayer = undefined;
      this.markersLayer = undefined;
    });
  }

  private syncHeatLayer(events: MappedEvent[], visible: boolean): void {
    if (!this.map || !this.heatLayer) return;

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

    const isAdded = this.map.hasLayer(this.heatLayer);
    if (visible && !isAdded) {
      this.heatLayer.addTo(this.map);
    } else if (!visible && isAdded) {
      this.map.removeLayer(this.heatLayer);
    }
  }

  private syncMarkersLayer(events: MappedEvent[], visible: boolean): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();

    for (const { event, lat, lng } of events) {
      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#faf8f8',
        weight: 2,
        fillColor: '#d1291a',
        fillOpacity: 0.9,
      });

      marker.bindPopup(() => this.createPopupContent(event));
      marker.addTo(this.markersLayer);
    }

    const isAdded = this.map.hasLayer(this.markersLayer);
    if (visible && !isAdded) {
      this.markersLayer.addTo(this.map);
    } else if (!visible && isAdded) {
      this.map.removeLayer(this.markersLayer);
    }
  }

  private createPopupContent(event: Event): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'event-popup';

    const title = document.createElement('strong');
    title.className = 'event-popup-title';
    title.textContent = event.title;
    wrapper.appendChild(title);

    if (event.location?.name) {
      const loc = document.createElement('div');
      loc.className = 'event-popup-location';
      loc.textContent = event.location.name;
      wrapper.appendChild(loc);
    }

    const meta = document.createElement('div');
    meta.className = 'event-popup-meta';
    const ratingText =
      event.rating != null ? `★ ${event.rating.toFixed(1)} · ` : '';
    meta.textContent = `${ratingText}${event.visits_count} visits`;
    wrapper.appendChild(meta);

    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'event-popup-link';
    link.textContent = 'View event';
    link.addEventListener('click', () => {
      void this.router.navigate(['/event', event.id]);
    });
    wrapper.appendChild(link);

    return wrapper;
  }
}
