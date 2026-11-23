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
  showControls?: boolean;
  className?: string;
}

function Carousel<T>({
  items,
  renderItem,
  getKey,
  overlay = true,
  label,
  itemLabel = 'item',
  showControls = true,
  className,
}: CarouselProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<number | null>(null); // slide we're currently animating to
  const [index, setIndex] = useState(0);

  if (items.length === 0) return null;

  const goTo = (i: number) => {
    const el = trackRef.current;
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    const slide = el?.children[clamped] as HTMLElement | undefined;
    if (!el || !slide) return;
    targetRef.current = clamped;
    slide.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest', // don't scroll the page vertically
    });
  };

  const step = (delta: number) => goTo((targetRef.current ?? index) + delta);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setIndex(closest);
    if (closest === targetRef.current) targetRef.current = null; // arrived
  };

  // if the user grabs the track mid-animation, forget the pending target
  const cancelTarget = () => {
    targetRef.current = null;
  };

  const isFirst = index === 0;
  const isLast = index === items.length - 1;

  return (
    <div
      className={`${styles.carousel} ${overlay ? styles.overlay : ''} ${className}`}
    >
      <div
        ref={trackRef}
        className={styles.track}
        onScroll={onScroll}
        onPointerDown={cancelTarget}
        onWheel={cancelTarget}
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

      {showControls && (
        <div className={styles.controls}>
          <Button
            icon="left"
            onClick={() => step(-1)}
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
            onClick={() => step(1)}
            disabled={isLast}
            aria-label={`Next ${itemLabel}`}
          />
        </div>
      )}
    </div>
  );
}

export default Carousel;
