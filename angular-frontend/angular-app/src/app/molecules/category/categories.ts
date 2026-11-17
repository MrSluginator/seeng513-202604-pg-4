import { FormControl, FormGroup } from '@angular/forms';
import { ColorGroup } from '../../../models/types';
import { IconName } from '../../atoms/icon/icons';

export interface CategoryConfig {
  text: string;
  icon: IconName;
  color: ColorGroup;
}

export const categories = {
  food: { text: 'Food', icon: 'food', color: 'p' },
  sights: { text: 'Sights', icon: 'sun', color: 'o' },
  events: { text: 'Events', icon: 'event', color: 'b' },
  activities: { text: 'Activities', icon: 'park', color: 'g' },
  nightlife: { text: 'Nightlife', icon: 'wine', color: 's' },
  other: { text: 'Exciting', icon: 'load', color: 'y' },
} satisfies Record<string, CategoryConfig>;

export type CategoryName = keyof typeof categories;

export const categoriesList = Object.keys(categories) as CategoryName[];

export type CategoryForm = FormGroup<Record<CategoryName, FormControl<boolean>>>;