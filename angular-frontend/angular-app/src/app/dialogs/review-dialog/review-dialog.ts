import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { IconProgressBar } from '../../molecules/icon-progress-bar/icon-progress-bar';
import { Event } from '../../../models/event';
import { Range } from '../../../models/types';
import { Slider } from '../../atoms/slider/slider';
import { formatTime, number2Time } from '../../../utils/format';
import { TextField } from '../../atoms/text-field/text-field';
import { Button } from '../../atoms/button/button';

export interface ReviewResult {
  rating: number;
  comment: string;
  time: Range<number>;
  crowdFactor: number;
}

function dateRangeValidator(
  control: AbstractControl<Range<number>>
): ValidationErrors | null {
  const [start, end] = control.value;
  return end >= start ? null : { dateRange: true };
}

@Component({
  selector: 'f-review-dialog',
  imports: [IconProgressBar, ReactiveFormsModule, Slider, TextField, Button],
  styleUrl: './review-dialog.css',
  templateUrl: './review-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewDialog {
  readonly event = input.required<Event>();
  readonly submitted = output<ReviewResult>();
  readonly cancelled = output<void>();

  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly maxComment = 500;
  protected readonly format: (time: number) => string = (time) =>
    formatTime(number2Time(time));

  protected readonly form = inject(NonNullableFormBuilder).group({
    rating: [3, [Validators.min(0), Validators.max(5)]],
    comment: ['', [Validators.maxLength(this.maxComment)]],
    time: [[0, 24] as Range<number>, [dateRangeValidator]],
    crowdFactor: [2, [Validators.min(0), Validators.max(5)]],
  });

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());

    inject(DestroyRef).onDestroy(() => {
      const el = this.dialog().nativeElement;
      if (el.open) el.close();
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { rating, comment, time, crowdFactor } = this.form.getRawValue();
    this.submitted.emit({ rating, comment: comment.trim(), time, crowdFactor });
  }

  protected cancel(): void {
    this.dialog().nativeElement.close();
  }

  protected onClose(): void {
    this.cancelled.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.cancel();
  }
}
