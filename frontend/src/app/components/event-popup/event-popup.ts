import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';
import type { Event } from '../../../models/event.schema';
import { Button } from '../../atoms/button/button';

@Component({
  imports: [Button],
  selector: 'f-event-popup',
  styleUrl: './event-popup.css',
  templateUrl: './event-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventPopup {
  private readonly router = inject(Router);

  readonly event = input.required<Event>();
  readonly busyness = input<number | null>(null);
  readonly busynessTime = input<string | null>(null);

  protected readonly busynessPercent = computed(() => {
    const value = this.busyness();
    return value === null ? null : Math.round(value * 100);
  });

  protected readonly busynessLevel = computed<
    'quiet' | 'moderate' | 'busy' | 'very-busy'
  >(() => {
    const pct = this.busynessPercent() ?? 0;
    if (pct <= 25) return 'quiet';
    if (pct <= 55) return 'moderate';
    if (pct <= 80) return 'busy';
    return 'very-busy';
  });

  protected readonly busynessLabel = computed(() => {
    switch (this.busynessLevel()) {
      case 'quiet':
        return 'Quiet';
      case 'moderate':
        return 'Moderate';
      case 'busy':
        return 'Busy';
      case 'very-busy':
        return 'Very busy';
    }
  });

  protected viewEvent(): void {
    void this.router.navigate(['/event', this.event().id]);
  }
}
