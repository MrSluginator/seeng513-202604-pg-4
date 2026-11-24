import { Component, computed, input, output } from '@angular/core';
import { IconName } from '../icon/icons';
import { Icon } from '../icon/icon';

@Component({
  selector: 'f-button',
  imports: [Icon],
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
  text = input<string>();
  icon = input<IconName>();
  iconPosition = input<'left' | 'right'>('right');
  disabled = input(false);
  pressed = input<boolean | undefined>(undefined);
  label = input<string>();
  type = input<string>('button');

  clicked = output<MouseEvent>();

  isToggle = computed(() => this.pressed() !== undefined);
}
