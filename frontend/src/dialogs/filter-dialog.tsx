import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Location } from '../types';
import { Button, Pin, RadioGroup, TextInput, Widget } from '../molecules';
import styles from '../assets/styles/filter-dialog.module.css';
import { formatTime, number2Time } from '../../util/format';
import { RangeFilter } from '../components';
import { AllCategories, Category } from '../molecules/category';

const sortOptions = {
  recommended: 'Recommended',
  price: 'Price',
  time: 'Time',
  distance: 'Distance from me',
  date: 'Date Posted',
};

type Sort = keyof typeof sortOptions;

export interface FilterProps {
  sort: Sort;
  sortDirection: 'asc' | 'desc';
  categories: Array<Category>;
  tags: Array<string>;
  locations: Array<Location>;
  timeRange?: { start: Date; end: Date };
  priceRange?: { lowest: number; highest: number };
  distanceRange?: { nearest: number; furthest: number };
}

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterProps) => void;
  initial?: FilterProps;
}

function FilterDialog({
  isOpen,
  onClose,
  onApply,
  initial = {
    sort: 'recommended',
    sortDirection: 'desc',
    categories: [],
    tags: [],
    locations: [],
  },
}: DialogProps) {
  const [filters, setFilters] = useState(initial);
  const closeBtnRef = useRef(null);

  // Close on Escape, lock page scroll while open, focus the close button
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null; // nothing renders when closed

  const reset = () => setFilters(initial);
  const apply = () => {
    onApply(filters);
    onClose();
  };

  const sortOrderOptions = Object.entries(sortOptions).map(([key, value]) => ({
    value: key,
    label: value,
  }));
  const setSort = (next: Sort) =>
    setFilters((prev) => ({ ...prev, sort: next }));
  const removeTag = (tag: string) => {
    filters.tags = filters.tags.filter((t) => t !== tag);
  };

  const toggleCategory = (category: Category, pressed: boolean) =>
    setFilters((prev) => ({
      ...prev,
      categories: pressed
        ? [...prev.categories.filter((c) => c !== category), category]
        : prev.categories.filter((c) => c !== category),
    }));

  // Portal renders the modal at the end of <body>, so parent
  // overflow/z-index/transform styles can't clip it
  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.filterDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="title">Filters &amp; Sorting</h2>
          <Button icon={'times'} onClick={onClose} aria-label="Close filters" />
        </header>

        <div className={styles.body}>
          <div className={styles.cats}>
            <div className={'column'} style={{ gap: '16px' }}>
              <h3>Categories</h3>
              <div className={'row between'}>
                <AllCategories
                  active={filters.categories}
                  onToggle={toggleCategory}
                />
              </div>
            </div>

            <div className={'column'} style={{ flex: 1 }}>
              <div className={'row between'}>
                <h3>Tags</h3>
                <TextInput placeholder="Search tags..." icon="search" />
              </div>
              <div className={'column'}>
                <p>Active Tags:</p>
                <div className={styles.tags}>
                  {filters.tags.map((tag) => (
                    <Widget
                      key={tag}
                      text={tag}
                      onChange={() => removeTag(tag)}
                      defaultPressed={true}
                      icon="times"
                      label={`remove ${tag} tag from filters`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className={'column'} style={{ flex: 1 }}>
              <div className={'row between'}>
                <h3>Location</h3>
                <TextInput placeholder="Search location..." icon="search" />
              </div>
              <small className={styles.locationInfo}>
                If the {/*<p>*/}Distance{/*</p>*/} filter is active, the feed
                will show events within the specified range from the following
                locations, otherwise we simply prioritize events near these
                locations.
              </small>
              <div className={styles.locations}>
                {filters.locations.map((loc, i) => (
                  <div key={loc.name} className={styles.row}>
                    <Pin number={i + 1} onClick={() => {}} />
                    {loc.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${styles.sort} column`}>
            <h3>Sort order</h3>
            <RadioGroup
              options={sortOrderOptions}
              value={filters.sort}
              onChange={setSort}
            />
          </div>

          <div className={styles.ranges}>
            <div className={'column'}>
              <h3>Time</h3>
              <RangeFilter
                defaultEnabled={!!filters.timeRange}
                lowLabel="Start Time"
                highLabel="End Time"
                format={(value) => formatTime(number2Time(value))}
                onChange={(n) =>
                  setFilters((prev) => ({
                    ...prev,
                    timeRange: n
                      ? { start: number2Time(n[0]), end: number2Time(n[1]) }
                      : undefined,
                  }))
                }
                slider={{
                  min: 0,
                  max: 24,
                  step: 0.25,
                  defaultValue: filters.timeRange
                    ? [
                        filters.timeRange.start.getHours(),
                        filters.timeRange.end.getHours(),
                      ]
                    : [9, 18],
                }}
              />
            </div>
            <div className={'column'}>
              <h3>Price</h3>
              <RangeFilter
                defaultEnabled={!!filters.priceRange}
                lowLabel="Lowest Price"
                highLabel="Highest Price"
                format={(value) => `$ ${value}`}
                onChange={(n) =>
                  setFilters((prev) => ({
                    ...prev,
                    priceRange: n ? { lowest: n[0], highest: n[1] } : undefined,
                  }))
                }
                slider={{
                  min: 0,
                  max: 200,
                  step: 5,
                  defaultValue: filters.priceRange
                    ? [filters.priceRange.lowest, filters.priceRange.highest]
                    : [0, 25],
                }}
              />
            </div>
            <div className={'column'}>
              <h3>Distance</h3>
              <RangeFilter
                defaultEnabled={!!filters.distanceRange}
                lowLabel="Shortest Distance"
                highLabel="Furthest Distance"
                format={(value) => `${value} km`}
                onChange={(n) =>
                  setFilters((prev) => ({
                    ...prev,
                    distanceRange: n
                      ? { nearest: n[0], furthest: n[1] }
                      : undefined,
                  }))
                }
                slider={{
                  min: 0,
                  max: 200,
                  step: 5,
                  defaultValue: filters.distanceRange
                    ? [
                        filters.distanceRange.nearest,
                        filters.distanceRange.furthest,
                      ]
                    : [0, 50],
                }}
              />
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <Button onClick={reset} text="reset" />
          <Button onClick={apply} text="apply filters" />
        </footer>
      </div>
    </div>,
    document.body
  );
}

export default FilterDialog;
