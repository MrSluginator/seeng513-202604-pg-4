import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

export interface RadioOption<T = unknown> {
  value: T;
  label: string;
  disabled?: boolean;
}

let nextId = 0;

@Component({
  selector: 'f-radio-group',
  styleUrl: './radio-group.css',
  templateUrl: './radio-group.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioGroupComponent),
      multi: true,
    },
  ],
})
export class RadioGroupComponent<T = unknown> implements ControlValueAccessor {
  // Inputs
  readonly options = input.required<RadioOption<T>[]>();
  readonly disabled = input<boolean>(false);
  readonly id = input<string | undefined>(undefined);

  // Internal state
  protected readonly value = signal<T | null>(null);
  private readonly formDisabled = signal(false);
  private readonly generatedName = `radio-group-${nextId++}`;

  protected readonly groupName = computed(
    () => this.id() ?? this.generatedName
  );
  protected readonly isDisabled = computed(
    () => this.disabled() || this.formDisabled()
  );

  // ControlValueAccessor callbacks
  private onChange!: (value: T) => void;
  protected onTouched!: () => void;

  writeValue(value: T | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  protected select(option: RadioOption<T>): void {
    if (this.isDisabled() || option.disabled) return;
    this.value.set(option.value);
    this.onChange(option.value);
    this.onTouched();
  }
}
