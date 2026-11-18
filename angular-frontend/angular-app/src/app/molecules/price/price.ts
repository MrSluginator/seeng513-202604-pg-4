import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../../atoms/icon/icon';

export interface PriceRange {
  low: number;
  high: number;
}

@Component({
  selector: 'f-price',
  imports: [Icon],
  templateUrl: './price.html',
  styleUrl: './price.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Price {
  readonly price = input<PriceRange>();

  protected readonly range = computed(() => {
    const p = this.price();
    return p ? `(${p.low} - ${p.high})` : 'Free';
  });

  protected readonly tier = computed(() => {
    const p = this.price();
    const avg = p ? (p.low + p.high) / 2 : 0;
    if (avg < 30) return 1;
    if (avg < 60) return 2;
    if (avg < 100) return 3;
    return 4;
  });

  protected readonly dollars = computed(() =>
    Array.from({ length: this.tier() }, (_, i) => i),
  );
}