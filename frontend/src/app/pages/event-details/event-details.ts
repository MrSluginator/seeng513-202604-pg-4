import { Component, computed, inject, input } from '@angular/core';
import { EventService, ReviewService } from '../../services/api-service';
import { EventCard } from '../../components/event-card/event-card';
import { HeatMap } from '../heat-map/heat-map';
import { Graph } from '../../molecules/graph/graph';
import { Footer } from '../../components/footer/footer';
import { Comment } from '../../molecules/comment/comment';

@Component({
  imports: [EventCard, HeatMap, Graph, Footer, Comment],
  selector: 'f-event-details',
  styleUrl: './event-details.css',
  templateUrl: './event-details.html',
})
export class EventDetails {
  private readonly eventApi = inject(EventService);
  private readonly reviewApi = inject(ReviewService);
  id = input.required<string>();

  protected readonly event = this.eventApi.getEventDetails(this.id);

  protected readonly reviews = this.reviewApi.getEventReviews(this.id);

  protected readonly graphData = computed(() => {
    if (!this.event.hasValue()) return [];
    const raw = this.event.value().crowd_by_hour;
    return Object.entries(raw).map(([hour, crowd]) => {
      const time = new Date(Date.parse(hour))
      return [time.getHours() * 60 + time.getMinutes(), Number.parseFloat(crowd)] as [number, number];
    }).sort((a, b) => a[0] - b[0]);
  })
}
