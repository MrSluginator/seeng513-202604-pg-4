import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../environments/environment';
import { isUUID } from '../../utils/validation';
import {
  Review,
  ReviewListSchema,
  ReviewRequest,
  ReviewSchema,
} from '../../models/review.schema';

@Service()
export class ReviewService {
  private readonly http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}`;

  getReview(id: () => string) {
    return httpResource(
      () => (isUUID(id()) ? `${this.base}/${id()}` : undefined),
      { parse: ReviewSchema.parse }
    );
  }

  getReviews(eventId: () => string, limit = 20, offset = 0) {
    return httpResource(
      () =>
        isUUID(eventId())
          ? {
              url: `${this.base}/events/${eventId()}/reviews`,
              params: { limit, offset },
            }
          : undefined,
      {
        parse: ReviewListSchema.parse,
        defaultValue: { total: 0, items: [] },
      }
    );
  }

  postReview(eventId: string, body: ReviewRequest) {
    return this.http.post<Review>(
      `${this.base}/events/${eventId}/reviews`,
      body
    );
  }

  updateReview(reviewId: string, body: ReviewRequest) {
    return this.http.post<Review>(`${this.base}/reviews/${reviewId}`, body);
  }

  deleteReview(reviewId: string) {
    return this.http.delete(`${this.base}/reviews/${reviewId}`);
  }
}
