import { DateRange, Location, PriceRange } from './types';

export interface Event {
  id: string;
  title: string;
  rating: number;
  reviews: number;
  defaultSaved: boolean;
  time: DateRange | Date;
  location: Location;
  price?: PriceRange;
  tags: string[];
  description: string;
  summary: string;
  imageUrl: string;
  imageUrls: string[];
}
