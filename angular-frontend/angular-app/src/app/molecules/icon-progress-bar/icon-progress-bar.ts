import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../../atoms/icon/icon';
import { IconName } from '../../atoms/icon/icons';
import { Color } from '../../../models/types';

@Component({
  selector: 'f-icon-progress-bar',
  imports: [Icon],
  templateUrl: './icon-progress-bar.html',
  styleUrl: './icon-progress-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconProgressBar {
  readonly value = input.required<number>();
  readonly min = input(0);
  readonly max = input(5);
  readonly iconName = input.required<IconName>();
  readonly backgroundColor = input<Color>();
  readonly fillColor = input<Color>();
  readonly label = input<string>();

  protected readonly clamped = computed(() =>
    Math.min(this.max(), Math.max(this.min(), this.value())),
  );

  // One entry per icon, 0 to 100: how much of that icon is filled
  protected readonly fills = computed(() => {
    const count = Math.max(0, Math.ceil(this.max() - this.min()));
    const offset = this.clamped() - this.min();
    return Array.from(
      { length: count },
      (_, i) => Math.min(1, Math.max(0, offset - i)) * 100,
    );
  });
}