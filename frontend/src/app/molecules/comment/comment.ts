import { Review } from '../../../models/review.schema';
import { Component, computed, input, signal } from '@angular/core';
import { Button } from '../../atoms/button/button';

@Component({
  imports: [Button],
  selector: 'f-comment',
  styleUrl: './comment.css',
  templateUrl: './comment.html',
})
export class Comment {
  readonly review = input<Review>();

  sparked = signal(false);
  sparkLabel = computed(() => `Send a spark to ${this.review()?.user_id}`);

  protected onSpark(): void {
    this.sparked.update((prev) => !prev);
  }
}
