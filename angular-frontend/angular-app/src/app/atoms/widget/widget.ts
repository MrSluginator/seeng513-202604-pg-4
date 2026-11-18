import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

export type IconPosition = 'left' | 'right' | 'top' | 'bottom';

@Component({
  imports: [Icon],
  selector: 'f-widget',
  styleUrl: './widget.css',
  templateUrl: './widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Widget),
      multi: true,
    },
  ],
})
export class Widget implements ControlValueAccessor {
  text = input<string>();
  icon = input<IconName>();
  iconPosition = input<IconPosition>('right');
  label = input<string>();

  pressed = model(false);
  disabled = model(false);

  protected bigget = computed(
    () => this.iconPosition() === 'top' || this.iconPosition() === 'bottom'
  );
  protected iconFirst = computed(
    () => this.iconPosition() === 'top' || this.iconPosition() === 'left'
  );

  private onChange: (value: boolean) => void = () => {};
  protected onTouched: () => void = () => {};

  protected toggle(): void {
    const next = !this.pressed();
    this.pressed.set(next);
    this.onChange(next);
  }

  // ControlValueAccessor
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
