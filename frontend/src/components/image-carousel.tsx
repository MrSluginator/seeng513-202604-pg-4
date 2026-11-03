import { useRef, useState } from 'react';
import styles from '../assets/styles/image-carousel.module.css';
import { Button } from '../molecules';

interface ImageCarouselProps {
  images: string[];
  title: string;
}

function ImageCarousel({ images, title }: ImageCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

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
  const isLast = index === images.length - 1;

  return (
    <div className={styles.carousel}>
      <div
        ref={trackRef}
        className={styles.track}
        onScroll={onScroll}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${title} photos`}
      >
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`${title} photo ${i + 1} of ${images.length}`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>

      {images.length > 1 && (
        <div className={styles.controls}>
          <Button
            icon='left'
            onClick={() => goTo(index - 1)}
            disabled={isFirst}
            aria-label="Previous photo"
          />

          <div className={styles.dots}>
            {images.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === index ? styles.active : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>

          <Button
            icon='right'
            onClick={() => goTo(index + 1)}
            disabled={isLast}
            aria-label="Next photo"
          />
        </div>
      )}
    </div>
  );
}

export default ImageCarousel;