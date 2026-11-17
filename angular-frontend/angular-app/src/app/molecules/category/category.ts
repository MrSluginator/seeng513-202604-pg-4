import { Component, computed, input, model } from '@angular/core';
import { WidgetComponent } from '../../atoms/widget/widget';
import { categories, CategoryName } from './categories';

@Component({
  selector: 'f-category',
  imports: [WidgetComponent],
  templateUrl: './category.html',
  styleUrl: './category.css',
})
export class CategoryWidget {
  category = input.required<CategoryName>();
  pressed = model(false);

  protected config = computed(() => categories[this.category()]);
}