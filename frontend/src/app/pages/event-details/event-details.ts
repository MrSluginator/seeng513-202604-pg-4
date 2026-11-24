import { Component, inject, input } from '@angular/core';
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

  protected readonly event = this.eventApi.getEvent(this.id);

  protected readonly reviews = this.reviewApi.getEventReviews(this.id);
}
