import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Button } from '../../atoms/button/button';
import { Icon } from '../../atoms/icon/icon';
import { IconName } from '../../atoms/icon/icons';

export interface MenuOption<T = string> {
  value: T;
  label: string;
  icon?: IconName;
  disabled?: boolean;
}

@Component({
  selector: 'f-menu-button',
  imports: [Button, Icon],
  templateUrl: './menu-button.html',
  styleUrl: './menu-button.css',
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
})
export class MenuButton<T = string> {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);

  private trigger = viewChild(Button, { read: ElementRef });
  private items = viewChildren<ElementRef<HTMLButtonElement>>('item');

  // Button passthrough
  text = input<string>();
  icon = computed<IconName>(() => (this.open() ? 'up' : 'down'));
  disabled = input(false);
  label = input<string>();

  // Menu
  options = input.required<MenuOption<T>[]>();
  align = input<'start' | 'end'>('start');

  selected = output<T>();

  protected open = signal(false);

  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.openMenu();
    }
  }

  protected openMenu(event?: Event): void {
    if (this.disabled()) return;
    event?.preventDefault();
    this.open.set(true);
    afterNextRender(() => this.focusItem(0), { injector: this.injector });
  }

  protected close(returnFocus = false): void {
    this.open.set(false);
    if (returnFocus) {
      this.trigger()?.nativeElement.querySelector('button')?.focus();
    }
  }

  protected select(option: MenuOption<T>): void {
    if (option.disabled) return;
    this.selected.emit(option.value);
    this.close(true);
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    const enabled = this.enabledItems();
    const current = enabled.indexOf(
      document.activeElement as HTMLButtonElement
    );

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusItem(current + 1 >= enabled.length ? 0 : current + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusItem(current <= 0 ? enabled.length - 1 : current - 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusItem(enabled.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        this.close(true);
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  protected onDocumentPointerDown(event: PointerEvent): void {
    if (
      this.open() &&
      !this.host.nativeElement.contains(event.target as Node)
    ) {
      this.close();
    }
  }

  private enabledItems(): HTMLButtonElement[] {
    return this.items()
      .map((item) => item.nativeElement)
      .filter((el) => !el.disabled);
  }

  private focusItem(index: number): void {
    this.enabledItems()[index]?.focus();
  }
}
