import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface TabOption<T = unknown> {
  value: T;
  label: string;
  disabled?: boolean;
}

let nextId = 0;

@Component({
  selector: 'f-tab-group',
  styleUrl: './tab-group.css',
  templateUrl: './tab-group.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TabGroup),
      multi: true,
    },
  ],
})
export class TabGroup implements ControlValueAccessor {
  options = input.required<TabOption[]>();

  protected readonly groupName = `f-tab-group-${nextId++}`;
  protected value = signal<unknown>(undefined);
  protected disabled = signal(false);

  private onChange: (value: unknown) => void = () => {};
  protected onTouched: () => void = () => {};

  protected select(option: TabOption): void {
    if (this.disabled() || option.disabled) return;
    this.value.set(option.value);
    this.onChange(option.value);
  }

  // ControlValueAccessor
  writeValue(value: unknown): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
