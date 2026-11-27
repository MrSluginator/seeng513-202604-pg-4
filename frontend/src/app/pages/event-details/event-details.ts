import { Component, computed, inject, input } from '@angular/core';
import { EventService } from '../../services/event-service';
import { EventCard } from '../../components/event-card/event-card';
import { HeatMap } from '../heat-map/heat-map';
import { Graph } from '../../molecules/graph/graph';
import { Footer } from '../../components/footer/footer';
import { Comment } from '../../molecules/comment/comment';
import { ReviewService } from '../../services/review-service';

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
  protected readonly reviews = this.reviewApi.getReviews(this.id);

  protected readonly graphData = computed(() => {
    if (!this.event.hasValue()) return [];
    const raw = this.event.value().crowd_by_hour;
    console.log(raw);
    const data = Object.entries(raw)
      .map(([hour, crowd]) => {
        return [Number.parseInt(hour) * 60, Number.parseFloat(crowd)] as [
          number,
          number,
        ];
      })
      .sort((a, b) => a[0] - b[0]);
    data.push([24 * 60, data[0][1]]);
    console.log(data);
    return data;
  });
}
