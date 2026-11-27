import { Review, ReviewList } from './../../../models/review.schema';
import { Component, computed, inject, input, signal } from '@angular/core';
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

  protected readonly reviews = this.reviewApi.getReviews(this.id);
  // protected readonly reviews = computed(
  //   () =>
  //     ({
  //       total: 1,
  //       items: [
  //         {
  //           id: '00-00',
  //           event_id: this.id(),
  //           user_id: '00-00',
  //           username: 'Big John',
  //           rating: 4.3,
  //           content:
  //             'this is a really cool event, please go, I need you to go please!',
  //           created_at: new Date(),
  //         },
  //       ],
  //     }) as ReviewList
  // );

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
