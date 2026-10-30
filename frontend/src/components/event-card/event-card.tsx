import { useState } from 'react';
import styles from '../../assets/styles/event-card.module.css';
import { Button } from '../../molecules';
import { NavLink } from 'react-router-dom';

interface EventProps {
  id: string,
  title: string,
  description: string,
  imageUrl: string
  rating: number,
  defaultSaved?: boolean,
}

function Rating({ value = 0 }) {
  return (
    <div className={styles.rating}>
      { }
    </div>
  );
}

function EventCard({ id, title, description, imageUrl, rating, defaultSaved = false }: EventProps) {
  const [saved, setSaved] = useState(defaultSaved);

  const onSave = () => setSaved((prev) => !prev);

  return (
    <div className={styles.card}>
      <div className={styles.save}>
        <Button icon='bookmark' onClick={onSave} pressed={saved} label={saved ? 'Remove from saved' : 'Save event'}></Button>
      </div>
      <div className={styles.image}>
        <img></img>
      </div>
      <div className={styles.info}>
        <div className={styles.titleBar}>
          <h3>
            <NavLink to={`/event/${id}`} className={styles.link}>
              {title}
            </NavLink>
          </h3>
          <Rating value={rating}></Rating>
        </div>
        {description}
      </div>
    </div>
  );
}

export default EventCard;
