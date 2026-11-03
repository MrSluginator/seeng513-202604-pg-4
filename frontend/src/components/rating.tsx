import styles from '../assets/styles/rating.module.css';
import { Icon } from '../molecules';

interface RatingProps {
  rating: number;
  reviews?: number;
}

function formatReviews(reviews: number): string {
    if (reviews < 1000) return `${reviews}`;
    if (reviews < 1000000) return `${(reviews / 1000).toFixed(1)}K`;
    return `${(reviews / 1000000).toFixed(1)}M`
}

function Rating({ rating, reviews }: RatingProps) {
  const max = 5;
  const clamped = Math.min(max, Math.max(0, rating));


  return (
    <div className={styles.box}>
      {reviews && <small>{`(${formatReviews(reviews)} reviews)`}</small>}
    <div
      className={styles.rating}
      role="img"
      aria-label={`Rated ${clamped} out of ${max}`}
      >
      {Array.from({ length: max }, (_, i) => {
        // 0 to 1: how much of this icon is filled
        const portion = Math.min(1, Math.max(0, clamped - i));
        
        return (
          <span key={i} className={styles.star} aria-hidden="true">
            <Icon name="spark" fill={true} />
            <span
              className={styles.filled}
              style={{ width: `${portion * 100}%` }}
              >
              <Icon name="spark" fill={true} />
            </span>
          </span>
        );
      })}
    </div>
    </div>
  );
}

export default Rating;
