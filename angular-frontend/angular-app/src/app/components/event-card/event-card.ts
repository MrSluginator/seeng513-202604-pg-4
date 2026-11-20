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
import { Event } from '../../../models/event.schema';
import {
  formatNumber,
  formatTime,
  formatTimeRange,
} from '../../../utils/format';
import { IconProgressBar } from '../../molecules/icon-progress-bar/icon-progress-bar';
import {
  ReviewDialog,
  ReviewResult,
} from '../../dialogs/review-dialog/review-dialog';

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

  readonly event = input.required<Event>();
  readonly size = input.required<EventSize>();
  protected readonly reviewOpen = signal(false);

  // Starts from event().defaultSaved and resets if a different event is passed in
  protected readonly saved = linkedSignal(() => this.event().saved);

  protected readonly saveLabel = computed(() =>
    this.saved() ? 'Remove from saved' : 'Save event'
  );

  protected readonly timeLabel = computed(() => {
    const time = this.event().time;
    return time instanceof Date ? formatTime(time) : formatTimeRange(time);
  });

  protected readonly ratingLabel = computed(() => `${this.event().rating}/5.0`);
  protected readonly reviewsLabel = computed(() => {
    return `${formatNumber(this.event().reviews)} reviews`;
  });

  protected readonly getKey = (src: string, i: number) => `${i}:${src}`;

  protected altFor(index: number): string {
    const { title, imageUrls } = this.event();
    return `${title} photo ${index + 1} of ${imageUrls.length}`;
  }

  protected searchTag(tag: string): void {
    this.router.navigate(['/search'], { queryParams: { tag } });
  }

  protected onSave(): void {
    this.saved.update((prev) => !prev);
  }

  protected onReview(): void {
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
