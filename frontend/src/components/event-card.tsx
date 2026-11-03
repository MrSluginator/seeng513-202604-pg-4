import { useState } from 'react';
import styles from '../assets/styles/event-card.module.css';
import { Button, Icon, Widget } from '../molecules';
import { NavLink, useNavigate } from 'react-router-dom';
import Rating from './rating';
import ImageCarousel from './image-carousel';

interface BaseEventProps {
  id: string;
  title: string;
  rating: number;
  defaultSaved: boolean;
}

interface MiniEventCardProps extends BaseEventProps {
  size: 's';
  time: TimeRange;
  location: string;
  price?: PriceRange;
  tags: Array<string>;
}

interface DefaultEventCardProps extends BaseEventProps {
  size?: 'm'; // optional so 'm' stays the default
  summary: string;
  imageUrl: string;
}

interface MegaEventCardProps extends BaseEventProps {
  size: 'l';
  description: string;
  imageUrl: string;
  reviews: number;
  time: TimeRange;
  location: string;
  price?: PriceRange;
  tags: Array<string>;
}

interface FullEventCardProps extends BaseEventProps {
  size: 'xl';
  description: string;
  imageUrls: Array<string>;
  reviews: number;
  time: TimeRange;
  location: string;
  price?: PriceRange;
  tags: Array<string>;
}

type EventProps =
  | MiniEventCardProps
  | DefaultEventCardProps
  | MegaEventCardProps
  | FullEventCardProps;

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
  const [saved, setSaved] = useState(props.defaultSaved);
  const size = props.size ?? 'm';

  const onSave = () => setSaved((prev) => !prev);
  const onRate = () => {};
  const onShare = () => {};

  const navigate = useNavigate();

  const Tags =
    props.size === 's' || props.size === 'l' || props.size === 'xl' ? (
      <div className={styles.tags}>
        {props.tags.map((tag) => (
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
      {(props.size === 'm' || props.size === undefined) && (
        <div className={styles.save}>
          <Button
            icon="bookmark"
            onClick={onSave}
            pressed={saved}
            label={saved ? 'Remove from saved' : 'Save event'}
          ></Button>
        </div>
      )}
      {props.size !== 's' && (
        <div className={styles.image}>
          {props.size !== 'xl' && <img src={props.imageUrl} alt="" />}
          {props.size === 'xl' && (
            <ImageCarousel images={props.imageUrls} title={props.title} />
          )}
        </div>
      )}
      <div className={styles.info}>
        <div className={styles.titleBar}>
          <h3>
            {(props.size === 'xl' && <div>{props.title}</div>) || (
              <NavLink to={`/event/${props.id}`} className={styles.link}>
                {props.title}
              </NavLink>
            )}
          </h3>
          <Rating rating={props.rating} reviews={props.reviews}></Rating>
        </div>
        {props.size === 's' && Tags}
        {(props.size === 's' || props.size === 'l' || props.size === 'xl') && (
          <div className={styles.stats}>
            <Price className={styles.price} price={props.price}></Price>
            <div className={styles.time}>
              <Icon name="clock" />
              <small>{formatTimeRange(props.time)}</small>
            </div>
            <div className={styles.location}>
              <Icon name="pin" />
              <small>{props.location}</small>
            </div>
          </div>
        )}
        {(props.size === 'l' || props.size === 'xl') && (
          <div className={styles.description}>
            <h3>About</h3>
            <text>{props.description}</text>
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
        {props.size !== 's' && Tags}
        {(props.size === 'm' || props.size === undefined) && props.summary}
      </div>
    </div>
  );
}

export default EventCard;
