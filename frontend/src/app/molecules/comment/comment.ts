import { Review } from '../../../models/review.schema';
import { Component, computed, input, signal } from '@angular/core';
import { Button } from '../../atoms/button/button';
import { IconProgressBar } from '../icon-progress-bar/icon-progress-bar';

@Component({
  imports: [Button, IconProgressBar],
  selector: 'f-comment',
  styleUrl: './comment.css',
  templateUrl: './comment.html',
})
export class Comment {
  readonly review = input<Review>();
  readonly ratingLabel = computed(() => `${this.review()?.rating ?? 0} / 5`);

  sparked = signal(false);
  sparkLabel = computed(() => `Send a spark to ${this.review()?.user_id}`);

  protected onSpark(): void {
    this.sparked.update((prev) => !prev);
  }
}
