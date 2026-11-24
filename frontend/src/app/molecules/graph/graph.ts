import {
  Component,
  computed,
  contentChild,
  input,
  TemplateRef,
} from '@angular/core';
import { IconName } from '../../atoms/icon/icons';
import { Icon } from '../../atoms/icon/icon';
import { clamp } from '../../../utils/math';

@Component({
  imports: [Icon],
  selector: 'f-graph',
  styleUrl: './graph.css',
  templateUrl: './graph.html',
})
export class Graph {
  readonly title = input<string>();
  readonly icon = input<IconName>('profile');
  readonly data = input.required<[number, number][]>();
  readonly min_y = input(1);
  readonly max_y = input(5);
  readonly min_x = input(0);
  readonly max_x = input(24 * 60);

  protected readonly inputs = [0,3,6,9,12,15,18,21,24];

  private readonly points = computed(() => {
    return this.data().map(([x, y]) => {
      const x_out = (x - this.min_x()) * 100 / (this.max_x() - this.min_x());
      const y_out = 100 - ((clamp(this.min_y(), this.max_y(), y) - this.min_y()) / (this.max_y() - this.min_y())) * 100;
      return `${x_out},${y_out}`;
    });
  });

  protected readonly line = computed(() => this.points()?.join(' '));
  protected readonly area = computed(() => `0,100 ${this.line()} 100,100`);

  protected readonly compactLevels = [
    { count: 3, position: 100 },
    { count: 2, position: 50 },
    { count: 1, position: 0 },
  ];
  protected readonly levels = [5, 4, 3, 2, 1];
}
