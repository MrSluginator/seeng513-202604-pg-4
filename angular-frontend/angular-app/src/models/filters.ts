import { CategoryName } from '../app/molecules/category/categories';
import { Location } from './types';

export const SORT_OPTIONS = {
  recommended: 'Recommended',
  price: 'Price',
  time: 'Time',
  distance: 'Distance from me',
  date: 'Date Posted',
};

export type Sort = keyof typeof SORT_OPTIONS;

export interface FilterProps {
  sort: Sort;
  sortDirection: 'asc' | 'desc';
  categories: CategoryName[];
  tags: string[];
  locations: Location[];
  timeRange?: { start: Date; end: Date };
  priceRange?: { lowest: number; highest: number };
  distanceRange?: { nearest: number; furthest: number };
}

export const DEFAULT_FILTERS: FilterProps = {
  sort: 'recommended',
  sortDirection: 'desc',
  categories: [],
  tags: [],
  locations: [],
};