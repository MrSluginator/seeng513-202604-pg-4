import styles from '../assets/styles/rating.module.css'
import { Icon } from '../molecules';

interface RatingProps {
  value: number;
  max: number;
}

function Rating({ value = 0, max = 5 }: RatingProps) {
  const clamped = Math.min(max, Math.max(0, value));

  return (
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
            <Icon name="spark" fill={true}/>
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
  );
}

export default Rating;