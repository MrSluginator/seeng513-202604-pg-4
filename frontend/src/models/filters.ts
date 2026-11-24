import { CategoryName } from '../app/molecules/category/categories';
import { Location } from './location.schema';
import { Tag } from './tag.schema';

export const SORT_OPTIONS = {
  rating: 'Rating',
  visits_count: 'Visits',
  price: 'Price',
  start_time: 'Start Time',
  distance: 'Distance from me',
  date: 'Date Posted',
  title: 'Title',
};

export type Sort = keyof typeof SORT_OPTIONS;

export interface FilterProps {
  sort: Sort;
  sortDirection: 'asc' | 'desc';
  limit: number;
  offset: number;
  categories: CategoryName[];
  tags: Tag[];
  locations: Location[];
  timeRange?: { start: Date; end: Date };
  priceRange?: { lowest: number; highest: number };
  distanceRange?: { nearest: number; furthest: number };
  query?: string;
}

export const DEFAULT_FILTERS: FilterProps = {
  sort: 'start_time',
  sortDirection: 'desc',
  limit: 20,
  offset: 0,
  categories: [],
  tags: [],
  locations: [],
};
