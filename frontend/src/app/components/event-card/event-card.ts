import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '../../atoms/icon/icon';
import { Button } from '../../atoms/button/button';
import { Carousel } from '../../molecules/carousel/carousel';
import { Widget } from '../../atoms/widget/widget';
import { Price } from '../../molecules/price/price';
import { Event, EventDetail } from '../../../models/event.schema';
import { formatNumber, formatTimeRange } from '../../../utils/format';
import { IconProgressBar } from '../../molecules/icon-progress-bar/icon-progress-bar';
import {
  ReviewDialog,
  ReviewResult,
} from '../../dialogs/review-dialog/review-dialog';
import { AuthService } from '../../services/auth-service';

export type EventSize = 's' | 'm' | 'l' | 'xl';

@Component({
  imports: [
    NgTemplateOutlet,
    RouterLink,
    Icon,
    Button,
    Carousel,
    Widget,
    Price,
    IconProgressBar,
    ReviewDialog,
  ],
  selector: 'f-event-card',
  styleUrl: './event-card.css',
  templateUrl: './event-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCard {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly event = input.required<Event | EventDetail>();
  readonly detail = computed(() => this.event() as EventDetail);
  readonly size = input.required<EventSize>();
  readonly link = input(true);
  protected readonly reviewOpen = signal(false);

  // Starts from event().defaultSaved and resets if a different event is passed in
  protected readonly saved = linkedSignal(() => this.event().saved);

  protected readonly saveLabel = computed(() =>
    this.saved() ? 'Remove from saved' : 'Save event'
  );

  protected readonly timeLabel = computed(() => {
    const time = this.event().time;
    if (time === null) return '';
    return formatTimeRange(time);
  });

  protected readonly ratingLabel = computed(() => `${this.event().rating}/5.0`);
  protected readonly reviewsLabel = computed(() => {
    return `${formatNumber(this.event().review_count)} reviews`;
  });

  protected readonly getKey = (src: string, i: number) => `${i}:${src}`;

  protected altFor(index: number): string {
    const { title, photos } = this.detail();
    return `${title} photo ${index + 1} of ${photos.length}`;
  }

  protected searchTag(tag: string): void {
    this.router.navigate(['/search'], { queryParams: { tag } });
  }

  protected onSave(): void {
    if (this.auth.requireRole(['standard'])) return;
    this.saved.update((prev) => !prev);
  }

  protected onReview(): void {
    if (this.auth.requireRole(['standard'])) return;
    this.reviewOpen.set(true);
  }

  protected onReviewSubmit(result: ReviewResult): void {
    this.reviewOpen.set(false);
    console.log(result);
  }

  protected onShare(): void {
    console.log('share');
  }
}
