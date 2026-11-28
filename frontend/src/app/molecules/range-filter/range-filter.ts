import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { Range } from '../../../models/types';
import { Slider, SliderValue } from '../../atoms/slider/slider';
import { TextInput } from '../../atoms/text-input/text-input';
import { ToggleButton } from '../../atoms/toggle-button/toggle-button';

export type RangeFilterValue = Range<number> | null;

@Component({
  selector: 'f-range-filter',
  imports: [FormsModule, Slider, TextInput, ToggleButton],
  templateUrl: './range-filter.html',
  styleUrl: './range-filter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RangeFilter),
      multi: true,
    },
  ],
})
export class RangeFilter implements ControlValueAccessor {
  readonly lowLabel = input.required<string>();
  readonly highLabel = input.required<string>();
  readonly format = input.required<(value: number) => string>();

  // Slider config
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  /** Range shown while the filter has no value (initially, and after a reset). */
  readonly defaultValue = input<Range<number>>();
  readonly step = input(1);
  readonly majorSteps = input(5);
  readonly minorSteps = input(4);
  readonly labelsPosition = input<'bottom' | 'top'>('bottom');
  readonly sliderLabel = input('Range');

  protected readonly enabled = signal(false);
  protected readonly range = linkedSignal<Range<number>>(
    () => this.defaultValue() ?? [this.min(), this.max()]
  );
  private readonly formDisabled = signal(false);

  /** The toggle and slider are inert when the form control is disabled. */
  protected readonly disabled = this.formDisabled.asReadonly();
  protected readonly inactive = computed(
    () => this.formDisabled() || !this.enabled()
  );

  protected readonly lowText = computed(() => this.format()(this.range()[0]));
  protected readonly highText = computed(() => this.format()(this.range()[1]));

  private onChange!: (value: RangeFilterValue) => void;
  private onTouched!: () => void;

  // ---- UI handlers ----

  protected handleToggle(next: boolean): void {
    if (this.formDisabled()) return;

    this.enabled.set(next);
    this.onChange(next ? this.range() : null);
    this.onTouched();
  }

  protected handleSlide(next: SliderValue): void {
    // The slider emits number | Range<number>; this filter is always a range
    if (typeof next === 'number' || this.formDisabled()) return;

    this.range.set(next);
    if (this.enabled()) this.onChange(next);
    this.onTouched();
  }

  // ---- ControlValueAccessor ----

  writeValue(value: RangeFilterValue | undefined): void {
    if (value) {
      this.enabled.set(true);
      this.range.set([value[0], value[1]]);
    } else {
      this.enabled.set(false);
      // this.range.set(this.defaultValue() ?? [this.min(), this.max()]);
    }
  }

  registerOnChange(fn: (value: RangeFilterValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
