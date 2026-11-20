import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icon } from '../../atoms/icon/icon';
import { IconName } from '../../atoms/icon/icons';
import { Color, Size } from '../../../models/types';

@Component({
  selector: 'f-icon-progress-bar',
  imports: [Icon],
  templateUrl: './icon-progress-bar.html',
  styleUrl: './icon-progress-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IconProgressBar),
      multi: true,
    },
  ],
})
export class IconProgressBar implements ControlValueAccessor {
  // model() allows [(value)] two-way binding, while plain [value] still works
  readonly value = model<number>();
  readonly min = input(0);
  readonly max = input(5);
  readonly iconName = input.required<IconName>();
  readonly backgroundColor = input<Color>('n7');
  readonly fillColor = input<Color>('n1');
  readonly label = input<string>();
  readonly size = input<Size>('xs');
  readonly padding = computed(() => `var(--padding-${this.size()})`);

  /** When true, the user can click / use the keyboard to change the value */
  readonly selectable = input(false);
  /** When true, clicking the currently selected icon resets the value to min */
  readonly allowClear = input(false);

  protected readonly disabled = signal(false);
  protected readonly interactive = computed(
    () => this.selectable() && !this.disabled()
  );

  // Value being previewed while hovering (interactive mode only)
  private readonly hovered = signal<number | null>(null);

  protected readonly clamped = computed(() =>
    Math.min(this.max(), Math.max(this.min(), this.value() ?? this.min()))
  );

  private readonly displayed = computed(() => this.hovered() ?? this.clamped());

  // One entry per icon, 0 to 100: how much of that icon is filled
  protected readonly fills = computed(() => {
    const count = Math.max(0, Math.ceil(this.max() - this.min()));
    const offset = this.displayed() - this.min();
    return Array.from(
      { length: count },
      (_, i) => Math.min(1, Math.max(0, offset - i)) * 100
    );
  });

  // No-op defaults so the component also works without a form control
  private onChange!: (value: number) => void;
  private onTouched!: () => void;

  // --- ControlValueAccessor ---
  writeValue(value: number | null): void {
    this.value.set(value ?? this.min());
  }
  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
    if (disabled) this.hovered.set(null);
  }

  protected markTouched(): void {
    this.onTouched();
  }

  // Every user-driven change goes through here
  private commit(next: number): void {
    this.value.set(next);
    this.onChange(next);
  }

  // --- User interaction ---
  protected select(index: number): void {
    if (!this.interactive()) return;
    const next = this.min() + index + 1; // 1 icon = 1 unit
    this.commit(
      this.allowClear() && next === this.clamped() ? this.min() : next
    );
    this.onTouched();
  }

  protected preview(index: number): void {
    if (this.interactive()) this.hovered.set(this.min() + index + 1);
  }

  protected clearPreview(): void {
    this.hovered.set(null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive()) return;

    const current = this.clamped();
    let next: number;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = Math.floor(current) + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = Math.ceil(current) - 1;
        break;
      case 'Home':
        next = this.min();
        break;
      case 'End':
        next = this.max();
        break;
      default:
        return;
    }

    event.preventDefault();
    this.commit(Math.min(this.max(), Math.max(this.min(), next)));
  }
}
