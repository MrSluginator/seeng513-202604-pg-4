import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { formatTime, number2Time } from '../../../utils/format';
import { Button } from '../../atoms/button/button';
import { Slider, SliderValue } from '../../atoms/slider/slider';

@Component({
  imports: [Button, FormsModule, RouterLink, Slider],
  selector: 'f-time-slider',
  styleUrl: './time-slider.css',
  templateUrl: './time-slider.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSlider {
  readonly hour = model.required<number>();
  readonly authRequired = input(false);

  private readonly currentHour = new Date().getHours();

  protected readonly formattedHour = computed(() =>
    formatTime(number2Time(this.hour()))
  );

  protected readonly isCurrentHour = computed(
    () => this.hour() === this.currentHour
  );

  protected readonly formatHourTick = (value: number): string => {
    const h = Math.round(value);
    if (h === 0) return '12a';
    if (h === 12) return '12p';
    return h < 12 ? `${h}a` : `${h - 12}p`;
  };

  protected onHourChange(value: SliderValue): void {
    if (typeof value !== 'number') return;
    this.hour.set(Math.min(23, Math.max(0, Math.round(value))));
  }

  protected resetToNow(): void {
    this.hour.set(this.currentHour);
  }
}
