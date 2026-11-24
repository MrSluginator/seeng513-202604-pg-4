import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
} from '@angular/core';
import { Button } from '../../atoms/button/button';
import { Carousel } from '../../molecules/carousel/carousel';
import { Event, EventDetail } from '../../../models/event.schema';
import { EventCard } from '../event-card/event-card';

export interface CarouselDisplay {
  type: 'carousel';
  controls: boolean;
}

export interface GridDisplay {
  type: 'grid';
  hidden: boolean;
}

export type EventGridDisplay = GridDisplay | CarouselDisplay;

@Component({
  imports: [Button, Carousel, EventCard],
  selector: 'f-event-grid',
  styleUrl: './event-grid.css',
  templateUrl: './event-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventGrid {
  readonly size = input.required<'s' | 'm' | 'l'>();
  readonly events = input.required<Event[]>();
  readonly display = input.required<EventGridDisplay>();

  // Narrowing a union behind a signal call doesn't work in templates,
  // so expose each variant as its own computed (null when not active)
  protected readonly carousel = computed(() => {
    const d = this.display();
    return d.type === 'carousel' ? d : null;
  });

  protected readonly grid = computed(() => {
    const d = this.display();
    return d.type === 'grid' ? d : null;
  });

  // Starts from display().hidden and resets if the parent passes a new display
  protected readonly hidden = linkedSignal(() => {
    const d = this.display();
    return d.type === 'grid' && d.hidden;
  });

  protected readonly toggleLabel = computed(() =>
    this.hidden() ? 'Show more' : 'Show less'
  );

  protected readonly toggleIcon = computed(() =>
    this.hidden() ? 'down' : 'up'
  );

  protected readonly getKey = (event: Event) => event.id;

  protected onShowMore(): void {
    this.hidden.update((prev) => !prev);
  }
}
