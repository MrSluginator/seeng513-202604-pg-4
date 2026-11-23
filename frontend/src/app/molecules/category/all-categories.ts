import { Component, input } from '@angular/core';
import { CategoryWidget } from './category';
import { CategoryForm, categoriesList } from './categories';

@Component({
  selector: 'f-all-categories',
  imports: [CategoryWidget],
  templateUrl: './all-categories.html',
  host: { style: 'display: contents' },
})
export class AllCategories {
  form = input.required<CategoryForm>();

  protected keys = categoriesList;
}
