import { Key, ReactNode, useRef, useState } from 'react';
import styles from '../assets/styles/carousel.module.css';
import { Button } from '../molecules';

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => Key;
  overlay?: boolean;
  label?: string;
  itemLabel?: string;
}

function Carousel<T>({
  items,
  renderItem,
  getKey,
  overlay = true,
  label,
  itemLabel = 'item',
}: CarouselProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (items.length === 0) return null;

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const isFirst = index === 0;
  const isLast = index === items.length - 1;

  return (
    <div className={`${styles.carousel} ${overlay ? styles.overlay : ''}`}>
      <div
        ref={trackRef}
        className={styles.track}
        onScroll={onScroll}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
      >
        {items.map((item, i) => (
          <div
            key={getKey(item, i)}
            className={styles.slide}
            role="group"
            aria-roledescription="slide"
            aria-label={`${itemLabel} ${i + 1} of ${items.length}`}
          >
            {renderItem(item, i)}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className={styles.controls}>
          <Button
            icon="left"
            onClick={() => goTo(index - 1)}
            disabled={isFirst}
            aria-label={`Previous ${itemLabel}`}
          />

          <div className={styles.dots}>
            {items.map((item, i) => (
              <button
                key={getKey(item, i)}
                className={`${styles.dot} ${i === index ? styles.active : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Go to ${itemLabel} ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>

          <Button
            icon="right"
            onClick={() => goTo(index + 1)}
            disabled={isLast}
            aria-label={`Next ${itemLabel}`}
          />
        </div>
      )}
    </div>
  );
}

export default Carousel;