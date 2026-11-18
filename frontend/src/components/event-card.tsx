
import styles from '../assets/styles/event-card.module.css';

export interface SearchEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  image?: string;
}

interface EventCardProps {
  event: SearchEvent;
}

function EventCard({ event }: EventCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.imageContainer}>
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholder}>
            Event Image
          </div>
        )}
      </div>

      <div className={styles.details}>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        <span className={styles.category}>
          {event.category}
        </span>
        <span className={styles.location}>
          {event.location}
        </span>
      </div>
    </article>
  );
}

export default EventCard;
