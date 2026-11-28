import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  Output,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

let nextId = 0;

@Component({
  imports: [Icon],
  selector: 'f-text-input',
  styleUrl: './text-input.css',
  templateUrl: './text-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextInput implements ControlValueAccessor, DoCheck {
  private readonly ngControl = inject(NgControl, {
    optional: true,
    self: true,
  });

  label = input<string>();
  placeholder = input<string>();
  icon = input<IconName>();
  iconPosition = input<'left' | 'right'>('right');
  iconLabel = input<string>();
  iconClicked = output<void>();
  readonly = input(false);
  id = input<string>(`f-text-input-${nextId++}`);
  type = input<string>('text');
  autocomplete = input<string>();
  error = input<string | null>();
  showError = input<boolean>(false);

  protected value = signal('');
  protected disabled = signal(false);

  private controlError = signal<string | null | undefined>(undefined);
  protected displayError = computed(() => this.error() ?? this.controlError());
  protected errorId = computed(() => `${this.id()}-error`);

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  ngDoCheck(): void {
    const c = this.ngControl?.control;
    const msg = c?.touched
      ? (c.errors?.['zod'] as string | undefined)
      : undefined;
    this.controlError.set(msg ?? null);
  }

  private onChange: (value: string) => void = () => {
    /* empty */
  };
  protected onTouched: () => void = () => {
    /* empty */
  };

  protected handleInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.onChange(next);
  }

  // ControlValueAccessor
  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
