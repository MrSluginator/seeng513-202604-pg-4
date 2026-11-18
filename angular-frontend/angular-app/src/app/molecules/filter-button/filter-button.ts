import { Component, input, output, signal } from '@angular/core';
import { Button } from '../../atoms/button/button';
import { FilterDialog, FilterProps } from '../../dialogs/filter-dialog/filter-dialog';

@Component({
  selector: 'f-filter-button',
  imports: [Button, FilterDialog],
  templateUrl: './filter-button.html',
})
export class FilterButton {
  filters = input<FilterProps>();

  applied = output<FilterProps>();

  protected open = signal(false);

  protected apply(filters: FilterProps): void {
    this.applied.emit(filters);
    this.open.set(false);
  }
}