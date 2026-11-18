import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'f-toggle-button',
  styleUrl: './toggle-button.css',
  templateUrl: './toggle-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleButton),
      multi: true,
    },
  ],
})
export class ToggleButton implements ControlValueAccessor {
  label = input<string>();

  protected pressed = signal(false);
  protected disabled = signal(false);

  private onChange: (value: boolean) => void = () => {};
  protected onTouched: () => void = () => {};

  protected toggle(): void {
    const next = !this.pressed();
    this.pressed.set(next);
    this.onChange(next);
  }

  writeValue(value: boolean | null): void {
    this.pressed.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
