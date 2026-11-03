import { useState } from 'react';
import styles from '../assets/styles/event-card.module.css';
import { Button, Icon, Widget } from '../molecules';
import { NavLink, useNavigate } from 'react-router-dom';
import Rating from './rating';
import Carousel from './carousel';

export interface Event {
  id: string;
  title: string;
  rating: number;
  reviews: number;
  defaultSaved: boolean;
  time: TimeRange;
  location: string;
  price?: PriceRange;
  tags: Array<string>;
  description: string;
  summary: string;
  imageUrl: string;
  imageUrls: Array<string>;
}

interface EventProps {
  event: Event;
  size: 's' | 'm' | 'l' | 'xl';
}

type PriceRange = {
  low: number;
  high: number;
};
interface PriceProps {
  price?: PriceRange;
  className?: string;
}

function Price({ price, className }: PriceProps) {
  const range = price ? `(${price.low} - ${price.high})` : 'Free';
  const avg = price ? (price.low + price.high) / 2 : 0;
  const count = (avg: number) => {
    if (avg < 30) return 1;
    if (avg < 60) return 2;
    if (avg < 100) return 3;
    return 4;
  };

  return (
    <div className={`${styles.price} ${className ?? ''}`}>
      <div
        className={`${styles.icons} ${!price ? styles.free : count(avg) === 4 ? styles.rich : ''}`}
      >
        {Array.from({ length: count(avg) }, (i: number) => (
          <Icon name="dollar" key={i} />
        ))}
      </div>
      <small>{range}</small>
    </div>
  );
}

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

type TimeRange = { start: Date; end: Date } | Date;

function formatTimeRange(time: TimeRange): string {
  if (time instanceof Date) return timeFormatter.format(time);
  return `${timeFormatter.format(time.start)} - ${timeFormatter.format(time.end)}`;
}

function EventCard(props: EventProps) {
  const size = props.size;
  const event = props.event;
  const [saved, setSaved] = useState(event.defaultSaved);

  const onSave = () => setSaved((prev) => !prev);
  const onRate = () => { };
  const onShare = () => { };

  const navigate = useNavigate();

  const Tags =
    size !== 'm' ? (
      <div className={styles.tags}>
        {event.tags.map((tag) => (
          <Widget
            key={tag}
            text={tag}
            pressed={null}
            onChange={() => {
              navigate(`/search?tag=${tag}`);
            }}
            label={`Search for events matching the tag: ${tag}`}
          />
        ))}
      </div>
    ) : null;

  return (
    <div className={`${styles.card} ${styles[size]}`}>
      {(size === 'm') && (
        <div className={styles.save}>
          <Button
            icon="bookmark"
            onClick={onSave}
            pressed={saved}
            label={saved ? 'Remove from saved' : 'Save event'}
          ></Button>
        </div>
      )}
      {size !== 's' && (
        <div className={styles.image}>
          {size !== 'xl' &&
            <img src={event.imageUrl} alt="" /> ||
            <Carousel
              items={event.imageUrls}
              getKey={(src: string) => src}
              itemLabel="photo"
              overlay={true}
              renderItem={(src: string, i: number) => (
                <img
                  src={src}
                  alt={`${event.title} photo ${i + 1} of ${event.imageUrls.length}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              )}
            />
          }
        </div>
      )}
      <div className={styles.info}>
        <div className={styles.titleBar}>
          <h3>
            {(size === 'xl' && <div>{event.title}</div>) || (
              <NavLink to={`/event/${event.id}`} className={styles.link}>
                {event.title}
              </NavLink>
            )}
          </h3>
          <Rating rating={event.rating} reviews={event.reviews}></Rating>
        </div>
        {size === 's' && Tags}
        {(size === 's' || size === 'l' || size === 'xl') && (
          <div className={styles.stats}>
            <Price className={styles.price} price={event.price}></Price>
            <div className={styles.time}>
              <Icon name="clock" />
              <small>{formatTimeRange(event.time)}</small>
            </div>
            <div className={styles.location}>
              <Icon name="pin" />
              <small>{event.location}</small>
            </div>
          </div>
        )}
        <div className={styles.descBox}>
          {(size === 'l' || size === 'xl') && (
            <div className={styles.description}>
              <h3>About</h3>
              <text>{event.description}</text>
              <div className={styles.interactables}>
                <Button
                  icon="spark"
                  onClick={onRate}
                  label={'Rate event'}
                ></Button>
                <Button
                  icon="share"
                  onClick={onShare}
                  label={'Share event'}
                ></Button>
                <Button
                  icon="bookmark"
                  onClick={onSave}
                  pressed={saved}
                  label={saved ? 'Remove from saved' : 'Save event'}
                ></Button>
              </div>
            </div>
          )}
          {size !== 's' && Tags}
        </div>
        {(size === 'm') && event.summary}
      </div>
    </div>
  );
}

export default EventCard;