import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Range } from '../../../models/types';

export type SliderValue = number | Range<number>;

interface Tick {
  value: number;
  major: boolean;
}

const INSET = 'var(--slider-inset)';

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

const inRail = (percent: number) =>
  `calc(${INSET} + (100% - 2 * ${INSET}) * ${percent / 100})`;

@Component({
  selector: 'f-slider',
  styleUrl: './slider.css',
  templateUrl: './slider.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Slider),
      multi: true,
    },
  ],
})
export class Slider implements ControlValueAccessor {
  min = input.required<number>();
  max = input.required<number>();
  step = input(1);
  /** Number of labeled ticks (minimum 2). */
  majorSteps = input(5);
  /** Number of small ticks between each labeled tick. */
  minorSteps = input(4);
  labelsPosition = input<'bottom' | 'top'>('bottom');
  formatLabel = input<(value: number) => string>(String);
  /** Accessible name for the slider. */
  label = input('Slider');

  protected disabled = signal(false);
  protected dragging = signal<number | null>(null);

  private raw = signal<SliderValue | null>(null);
  private activeIndex: number | null = null;
  private inset = viewChild.required<ElementRef<HTMLDivElement>>('inset');

  private onChange: (value: SliderValue) => void = () => {};
  protected onTouched: () => void = () => {};

  // ---- derived state ----

  private current = computed<SliderValue>(() => this.raw() ?? this.min());

  protected isRange = computed(() => typeof this.current() !== 'number');

  private values = computed<number[]>(() => {
    const c = this.current();
    return typeof c === 'number' ? [c] : [...c].sort((a, b) => a - b);
  });

  private majorCount = computed(() => Math.max(2, this.majorSteps()));

  private majorStep = computed(
    () => (this.max() - this.min()) / (this.majorCount() - 1),
  );

  protected ticks = computed<Tick[]>(() => {
    const min = this.min();
    const majorStep = this.majorStep();
    const count = this.majorCount();
    const minor = this.minorSteps();
    const ticks: Tick[] = [];

    for (let i = 0; i < count; i += 1) {
      const value = min + i * majorStep;
      ticks.push({ value, major: true });

      if (i < count - 1) {
        for (let j = 1; j <= minor; j += 1) {
          ticks.push({
            value: value + (j * majorStep) / (minor + 1),
            major: false,
          });
        }
      }
    }
    return ticks;
  });

  protected labels = computed(() =>
    this.ticks()
      .filter((t) => t.major)
      .map((t) => ({
        text: this.formatLabel()(t.value),
        left: `${this.toPercent(t.value)}%`,
      })),
  );

  protected thumbs = computed(() => {
    const isRange = this.isRange();
    const label = this.label();
    const format = this.formatLabel();

    return this.values().map((value, i) => ({
      value,
      left: `${this.toPercent(value)}%`,
      text: format(value),
      ariaLabel: isRange ? `${label} ${i === 0 ? 'start' : 'end'}` : label,
    }));
  });

  protected fill = computed(() => {
    const values = this.values();
    const isRange = this.isRange();
    const start = isRange ? this.toPercent(values[0]!) : 0;
    const end = this.toPercent(values[values.length - 1]!);

    return {
      left: isRange ? inRail(start) : '0',
      right: inRail(100 - end),
    };
  });

  // ---- pointer + keyboard ----

  protected handlePointerDown(e: PointerEvent): void {
    if (this.disabled() || e.button !== 0) return;
    const v = this.valueFromClientX(e.clientX);
    if (v === null) return;

    let index = 0;
    if (this.isRange()) {
      const [a, b] = this.values() as Range<number>;
      const d0 = Math.abs(v - a);
      const d1 = Math.abs(v - b);
      index = d0 < d1 || (d0 === d1 && v < a) ? 0 : 1;
    }

    this.activeIndex = index;
    this.dragging.set(index);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.commit(index, v);
  }

  protected handlePointerMove(e: PointerEvent): void {
    if (this.disabled() || this.activeIndex === null) return;
    const v = this.valueFromClientX(e.clientX);
    if (v !== null) this.commit(this.activeIndex, v);
  }

  protected endDrag(): void {
    if (this.activeIndex !== null) this.onTouched();
    this.activeIndex = null;
    this.dragging.set(null);
  }

  protected handleKeyDown(e: KeyboardEvent, index: number): void {
    if (this.disabled()) return;

    const step = this.step();
    const majorStep = this.majorStep();
    const v = this.values()[index]!;
    const targets: Partial<Record<string, number>> = {
      ArrowRight: v + step,
      ArrowUp: v + step,
      ArrowLeft: v - step,
      ArrowDown: v - step,
      PageUp: v + majorStep,
      PageDown: v - majorStep,
      Home: this.min(),
      End: this.max(),
    };

    const target = targets[e.key];
    if (target === undefined) return;
    e.preventDefault();
    this.commit(index, this.snap(target));
  }

  // ---- helpers ----

  private toPercent(v: number): number {
    return ((v - this.min()) / (this.max() - this.min())) * 100;
  }

  private snap(v: number): number {
    const { min, step } = { min: this.min(), step: this.step() };
    return clamp(Math.round((v - min) / step) * step + min, min, this.max());
  }

  private valueFromClientX(clientX: number): number | null {
    const rect = this.inset().nativeElement.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return this.snap(this.min() + ratio * (this.max() - this.min()));
  }

  private commit(index: number, next: number): void {
    if (this.disabled()) return;

    const values = this.values();
    const isRange = this.isRange();

    // a thumb can't cross its neighbour
    const lo = isRange && index === 1 ? values[0]! : this.min();
    const hi = isRange && index === 0 ? values[1]! : this.max();
    const clamped = clamp(next, lo, hi);
    if (clamped === values[index]) return;

    const arr = [...values];
    arr[index] = clamped;
    const out: SliderValue = isRange ? [arr[0]!, arr[1]!] : arr[0]!;

    this.raw.set(out);
    this.onChange(out);
  }

  // ControlValueAccessor
  writeValue(value: SliderValue | null): void {
    this.raw.set(Array.isArray(value) ? ([...value] as Range<number>) : value);
  }

  registerOnChange(fn: (value: SliderValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}