import {
  ChangeDetectionStrategy,
  Component,
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

  protected viewEvent(): void {
    void this.router.navigate(['/event', this.event().id]);
  }
}
