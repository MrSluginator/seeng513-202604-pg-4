import { Review } from '../../../models/review.schema';
import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'f-comment',
  styleUrl: './comment.css',
  templateUrl: './comment.html',
})
export class Comment {
  readonly review = input<Review>();
}
