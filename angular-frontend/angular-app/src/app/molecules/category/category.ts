import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Widget } from '../../atoms/widget/widget';
import { categories, CategoryName } from './categories';

@Component({
  selector: 'f-category',
  imports: [Widget, ReactiveFormsModule],
  templateUrl: './category.html',
  styleUrl: './category.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryWidget {
  readonly category = input.required<CategoryName>();
  readonly control = input.required<FormControl<boolean>>();

  protected readonly config = computed(() => categories[this.category()]);
}