import { Component, computed, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';

// TODO: adjust these paths to match your folder structure
import {
  RangeFilter,
  RangeFilterValue,
} from '../../molecules/range-filter/range-filter';
import {
  MenuButton,
  MenuOption,
} from '../../molecules/menu-button/menu-button';
import { IconProgressBar } from '../../molecules/icon-progress-bar/icon-progress-bar';
import { Event } from '../../../models/event';
import { FilterButton } from '../../molecules/filter-button/filter-button';
import {
  EventGrid,
  EventGridDisplay,
} from '../../components/event-grid/event-grid';
import { EventCard, EventSize } from '../../components/event-card/event-card';

// Adjust the fields to match your real Event model
const makeEvent = (
  id: number,
  overrides: Record<string, unknown> = {}
): Event =>
  ({
    id,
    title: `Test event ${id}`,
    description: 'A sample event used for testing the card layout.',
    imageUrls: [
      `https://picsum.photos/seed/${id}a/600/400`,
      `https://picsum.photos/seed/${id}b/600/400`,
      `https://picsum.photos/seed/${id}c/600/400`,
    ],
    imageUrl: `https://picsum.photos/seed/${id}a/600/400`,
    time: new Date(2026, 11, 5, 19, 30),
    rating: 4.3,
    reviews: 1234,
    defaultSaved: false,
    tags: ['music', 'outdoor', 'family'],
    ...overrides,
  }) as unknown as Event;

@Component({
  imports: [
    ReactiveFormsModule,
    JsonPipe,
    RangeFilter,
    MenuButton,
    IconProgressBar,
    FilterButton,
    EventGrid,
    EventCard,
  ],
  selector: 'f-testing',
  styleUrl: './testing.css',
  templateUrl: './testing.html',
})
export class Testing {
  // ---------- Range filter ----------
  protected readonly priceControl = new FormControl<RangeFilterValue>(null);
  protected readonly formatPrice = (v: number) => `$${v}`;

  protected setPrice(): void {
    this.priceControl.setValue([30, 60]);
  }
  protected resetPrice(): void {
    this.priceControl.reset();
  }

  // ---------- Menu button ----------
  protected readonly menuOptions: MenuOption[] = [
    { value: 'edit', label: 'Edit', icon: 'up' },
    { value: 'duplicate', label: 'Duplicate' },
    { value: 'archive', label: 'Archive (disabled)', disabled: true },
    { value: 'delete', label: 'Delete' },
  ];
  protected readonly menuAlign = signal<'start' | 'end'>('start');
  protected readonly menuDisabled = signal(false);
  protected readonly lastMenuSelection = signal<string | null>(null);

  // ---------- Icon progress bar ----------
  // Swap for a better icon (e.g. a star) if your icon set has one
  protected readonly ratingControl = new FormControl<number>(3);
  protected readonly twoWayValue = signal(2.5);
  protected readonly allowClear = signal(true);

  // ---------- Events ----------
  protected readonly events: Event[] = [
    makeEvent(1),
    makeEvent(2, {
      title: 'Saved by default',
      defaultSaved: true,
      rating: 4.9,
    }),
    makeEvent(3, {
      title: 'A very long event title that should wrap or truncate nicely',
      reviews: 1250000,
    }),
    makeEvent(4, { rating: 2.5, reviews: 0 }),
    makeEvent(5),
    makeEvent(6),
    makeEvent(7),
  ];

  // ---------- Event card ----------
  protected readonly cardSizes: EventSize[] = ['s', 'm', 'l', 'xl'];
  protected readonly cardSize = signal<EventSize>('m');
  protected onSizeChange(size: string) {
    this.cardSize.set(size as EventSize);
  }
  protected readonly cardEventIndex = signal(0);
  protected readonly cardEvent = computed(
    () => this.events[this.cardEventIndex()]
  );

  // ---------- Event grid ----------
  protected readonly gridSizes = ['s', 'm', 'l'] as const;
  protected readonly gridSize = signal<'s' | 'm' | 'l'>('m');
  protected readonly gridType = signal<'grid' | 'carousel'>('grid');
  protected readonly gridHidden = signal(true);
  protected readonly carouselControls = signal(true);
  protected readonly eventCount = signal(7);

  protected readonly gridDisplay = computed<EventGridDisplay>(() =>
    this.gridType() === 'grid'
      ? { type: 'grid', hidden: this.gridHidden() }
      : { type: 'carousel', controls: this.carouselControls() }
  );
  protected readonly gridEvents = computed(() =>
    this.events.slice(0, this.eventCount())
  );

  protected toggleDisabled(control: FormControl) {
    if (control.disabled) {
      control.enable();
    } else {
      control.disable();
    }
  }
}
