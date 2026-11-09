import { useState } from 'react';
import styles from '../assets/styles/event-card.module.css';
import { Button, Icon, Widget } from '../molecules';
import { NavLink, useNavigate } from 'react-router-dom';
import Rating from './rating';
import Carousel from './carousel';
import { DateRange } from '../types';
import { formatTime, formatTimeRange } from '../../util/format';

export type PriceRange = {
  low: number;
  high: number;
};

export interface Event {
  id: string;
  title: string;
  rating: number;
  reviews: number;
  defaultSaved: boolean;
  time: DateRange | Date;
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

interface PriceProps {
  price?: PriceRange;
  className?: string;
}

function Price({ price, className }: PriceProps) {
  const range = price ? `(${price.low} - ${price.high})` : 'Free';
  const avg = price ? (price.low + price.high) / 2 : 0;
  const tier = (avg: number) => {
    if (avg < 30) return 1;
    if (avg < 60) return 2;
    if (avg < 100) return 3;
    return 4;
  };

  const tone = !price ? styles.free : tier(avg) === 4 ? styles.rich : '';

  return (
    <div className={styles.price}>
      <div className={`${styles.icons} ${tone}`}>
        {Array.from({ length: tier(avg) }, (_, i) => (
          <Icon name="dollar" key={i} />
        ))}
      </div>
      <small>{range}</small>
    </div>
  );
}

function EventImage({ event, gallery }: { event: Event; gallery: boolean }) {
  return (
    <div className={styles.image}>
      {gallery ? (
        <Carousel
          items={event.imageUrls}
          getKey={(src: string, i: number) => `${i}:${src}`}
          itemLabel="photo"
          overlay
          renderItem={(src: string, i: number) => (
            <img
              src={src}
              alt={`${event.title} photo ${i + 1} of ${event.imageUrls.length}`}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          )}
        />
      ) : (
        <img src={event.imageUrl} alt="" />
      )}
    </div>
  );
}

function EventStats({
  price,
  time,
  location,
}: {
  price?: PriceRange;
  time: DateRange | Date;
  location: string;
}) {
  return (
    <div className={styles.stats}>
      <Price className={styles.price} price={price}></Price>
      <div className={styles.time}>
        <Icon name="clock" />
        <small>
          {time instanceof Date
            ? formatTime(time)
            : formatTimeRange(time)}
        </small>
      </div>
      <div className={styles.location}>
        <Icon name="pin" />
        <small>{location}</small>
      </div>
    </div>
  );
}

function EventTags({ tags }: { tags: Array<string> }) {
  const navigate = useNavigate();

  return (
    <div className={styles.tags}>
      {tags.map((tag) => (
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
  );
}

function EventInteractables({
  event,
  share = true,
  save = true,
  rate = true,
}: {
  event: Event;
  share?: boolean;
  save?: boolean;
  rate?: boolean;
}) {
  const [saved, setSaved] = useState(event.defaultSaved);

  const onSave = () => setSaved((prev) => !prev);
  const onRate = () => {};
  const onShare = () => {};

  return (
    <div className={styles.interactables}>
      {rate && <Button icon="spark" onClick={onRate} label={'Rate event'} />}
      {share && <Button icon="share" onClick={onShare} label={'Share event'} />}
      {save && (
        <Button
          icon="bookmark"
          onClick={onSave}
          pressed={saved}
          label={saved ? 'Remove from saved' : 'Save event'}
        />
      )}
    </div>
  );
}

function EventCard(props: EventProps) {
  const size = props.size;
  const event = props.event;

  return (
    <div className={`${styles.card} ${styles[size]}`}>
      {size === 'm' && (
        <EventInteractables event={event} rate={true} share={true} />
      )}
      {size !== 's' && <EventImage event={event} gallery={size === 'xl'} />}
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
        {size !== 'm' && <EventTags tags={event.tags} />}
        {size !== 'm' && (
          <EventStats
            price={event.price}
            time={event.time}
            location={event.location}
          />
        )}
        {size === 'm' && event.summary}
        {(size === 'l' || size === 'xl') && (
          <div className={styles.description}>
            <div className="row">
              <h3>About</h3>
              <EventInteractables event={event} />
            </div>
            <p>{event.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventCard;
