import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Category, ColorGroup, Location } from '../types';
import {
  Button,
  Pin,
  RadioGroup,
  TextInput,
  ToggleButton,
  Widget,
} from '../molecules';
import styles from '../assets/styles/filter-dialog.module.css';
import { IconName } from '../molecules/icon';
import Slider, { SliderProps } from '../molecules/slider';
import { formatTime, number2Time } from '../../util/format';

const sortOptions = {
  recommended: 'recommended',
  price: 'Price',
  time: 'Time',
  distance: 'Distance from me',
  date: 'Date Posted',
};

type Sort = keyof typeof sortOptions;

function CategoryWidgets({ active }: { active: Array<Category> }) {
  const categoryProps: {
    [key: string]: { text: string; icon: IconName; color: ColorGroup };
  } = {
    food: { text: 'Food', icon: 'food', color: 'p' },
    sights: { text: 'Sights', icon: 'sun', color: 'o' },
    events: { text: 'Events', icon: 'event', color: 'b' },
    activities: { text: 'Activities', icon: 'park', color: 'g' },
    nightlife: { text: 'Nightlife', icon: 'wine', color: 's' },
    other: { text: 'Exciting', icon: 'load', color: 'y' },
  };

  return Object.entries(categoryProps).map(([key, value]) => (
    <Widget
      key={key}
      text={value.text}
      icon={value.icon}
      iconPosition="top"
      className={styles[value.color]}
    />
  ));
}

function RangeFilter({
  defaultEnabled,
  lowLabel,
  highLabel,
  format,
  slider,
  onChange,
}: {
  defaultEnabled: boolean;
  lowLabel: string;
  highLabel: string;
  format: (value: number) => string;
  slider: SliderProps<[number, number]>;
  /** Called with the range when enabled, or null when the filter is turned off */
  onChange?: (range: [number, number] | null) => void;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [[low, high], setRange] = useState<[number, number]>(slider.defaultValue);

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    onChange?.(next ? [low, high] : null);
  };

  const handleSlide = (next: [number, number]) => {
    setRange(next);
    if (enabled) onChange?.(next);
  };

  return (
    <div className={styles.rangeFilter} aria-disabled={!enabled}>
      <ToggleButton pressed={enabled} onChange={handleToggle} />
      <div className={styles.content}>
        <TextInput
          className={styles.input}
          label={lowLabel}
          value={format(low)}
          readonly
          disabled={!enabled}
        />
          <Slider {...slider} onChange={handleSlide} disabled={!enabled} />
        <TextInput
          className={styles.input}
          label={highLabel}
          value={format(high)}
          readonly
          disabled={!enabled}
        />
      </div>
    </div>
  );
}

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
    const onKey = (e) => e.key === 'Escape' && onClose();
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
  const onSortChange = () => { };
  const removeTag = (tag: string) => {
    filters.tags = filters.tags.filter(t => t !== tag);
  };

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
                <CategoryWidgets active={filters.categories} />
              </div>
            </div>

            <div className={'column'}>
              <div className={'row between'}>
                <h3>Tags</h3>
                <TextInput placeholder="Search tags..." icon="search" />
              </div>
              <div className={'column'}>
                <div className={styles.rows}>
                  {filters.tags.map((tag) => (
                    <Widget key={tag} text={tag} onChange={() => removeTag(tag)} defaultPressed={true} icon='times' label={`remove ${tag} tag from filters`} />
                  ))}
                </div>
              </div>
            </div>
            <div className={'column'}>
              <div className={'row between'}>
                <h3>Location</h3>
                <TextInput placeholder="Search location..." icon="search" />
              </div>
            </div>
            <div className={styles.locations}>
              {filters.locations.map((loc, i) => (
                <div key={loc.name} className={styles.row}>
                  <Pin number={i + 1} onClick={() => { }} />
                  {loc.name}
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.sort} column`}>
            <h3>Sort order</h3>
            <RadioGroup
              options={sortOrderOptions}
              value={filters.sort}
              onChange={onSortChange}
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
