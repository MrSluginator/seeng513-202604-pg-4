import { Component, computed, input } from '@angular/core';
import { Color, Size } from '../../../models/types';

@Component({
  imports: [],
  selector: 'f-divider',
  styleUrl: './divider.css',
  template: '',
  host: {
    role: 'separator',
    '[attr.aria-orientation]': 'direction()',
    '[class.horizontal]': "direction() === 'horizontal'",
    '[class.vertical]': "direction() === 'vertical'",
    '[style.--divider-color]': 'resolvedColor()',
    '[style.--divider-size]': 'resolvedSize()',
  },
})
export class Divider {
  readonly direction = input<'horizontal' | 'vertical'>('horizontal');
  readonly color = input<Color>('n5');
  readonly size = input<Size>('s');

  protected resolvedColor = computed(() => `var(--${this.color()})`);
  protected resolvedSize = computed(() => `var(--divider-${this.size()})`);
}
