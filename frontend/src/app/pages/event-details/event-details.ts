import { Component, computed, inject, input, signal } from '@angular/core';
import { EventService } from '../../services/event-service';
import { EventCard } from '../../components/event-card/event-card';
import { HeatMap } from '../heat-map/heat-map';
import { Graph } from '../../molecules/graph/graph';
import { Footer } from '../../components/footer/footer';
import { Comment } from '../../molecules/comment/comment';
import { ReviewService } from '../../services/review-service';
import { SavedEventService } from '../../services/saved-event-service';
import { AuthService } from '../../services/auth-service';
import {
  ReviewDialog,
  ReviewResult,
} from '../../dialogs/review-dialog/review-dialog';
import { Button } from '../../atoms/button/button';
import { ReviewRequest } from '../../../models/review.schema';

@Component({
  imports: [EventCard, HeatMap, Graph, Footer, Comment, ReviewDialog, Button],
  selector: 'f-event-details',
  styleUrl: './event-details.css',
  templateUrl: './event-details.html',
})
export class EventDetails {
  private readonly auth = inject(AuthService);
  private readonly eventApi = inject(EventService);
  private readonly savedEventApi = inject(SavedEventService);
  private readonly reviewApi = inject(ReviewService);
  id = input.required<string>();

  protected readonly _event = this.eventApi.getEventDetails(this.id);
  protected readonly event = computed(() => {
    if (this._event.hasValue())
      return {
        ...this._event.value(),
        is_saved: this._event.value()
          ? this.savedEventApi.isSaved(this._event.value()!.id)
          : false,
      };
    return undefined;
  });
  protected readonly reviews = this.reviewApi.getReviews(this.id);
  protected readonly reviewOpen = signal(false);

  protected readonly graphData = computed(() => {
    const e = this.event();
    if (!e) return [];
    const raw = e.crowd_by_hour;
    const data = Object.entries(raw)
      .map(([hour, crowd]) => {
        return [Number.parseInt(hour) * 60, Number.parseFloat(crowd)] as [
          number,
          number,
        ];
      })
      .sort((a, b) => a[0] - b[0]);
    data.push([24 * 60, data[0][1]]);
    return data;
  });

  protected onReview(): void {
    if (this.auth.requireRole(['standard'])) return;
    this.reviewOpen.set(true);
  }

  protected onReviewSubmit(result: ReviewResult): void {
    this.reviewOpen.set(false);
    const req: ReviewRequest = {
      rating: result.rating,
      content: result.comment,
    };
    this.reviewApi.postReview(this.id(), req).subscribe();
  }
}
