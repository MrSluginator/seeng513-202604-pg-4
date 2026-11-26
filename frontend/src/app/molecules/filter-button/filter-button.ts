import { Component, inject } from '@angular/core';
import { Button } from '../../atoms/button/button';
import { FilterService } from '../../services/filter-service';

@Component({
  selector: 'f-filter-button',
  imports: [Button],
  templateUrl: './filter-button.html',
})
export class FilterButton {
  protected readonly filterService = inject(FilterService);
}
