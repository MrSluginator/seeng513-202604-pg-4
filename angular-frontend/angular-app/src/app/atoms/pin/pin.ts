import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';
import { Size as PinSize } from '../../../models/types';

const HEAD_CENTER = { x: 15.2, y: 15 };
const VIEWBOX_WIDTH = 31;
const VIEWBOX_HEIGHT = 44;

@Component({
  selector: 'f-pin',
  styleUrl: './pin.css',
  templateUrl: './pin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinComponent {
  readonly number = input<number | undefined, unknown>(undefined, {
    transform: (v) => (v == null || v === '' ? undefined : numberAttribute(v)),
  });
  readonly size = input<PinSize>('s');
  readonly label = input<string | undefined>(undefined);
  readonly selected = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly headCenter = HEAD_CENTER;
  protected readonly viewBox = `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`;

  protected readonly hasNumber = computed(() => this.number() !== undefined);
  protected readonly text = computed(() => String(this.number() ?? ''));
  protected readonly ariaLabel = computed(
    () => this.label() ?? (this.hasNumber() ? `Pin ${this.text()}` : 'Pin'),
  );
  protected readonly width = computed(() => `var(--pin-${this.size()})`);
  protected readonly height = computed(
    () => `calc(var(--pin-${this.size()}) * ${VIEWBOX_HEIGHT} / ${VIEWBOX_WIDTH})`,
  );
}