import { Button, MenuButton, Widget } from '../molecules';
import styles from '../assets/styles/event-grid.module.css';
import EventCard, { Event } from './event-card';
import Carousel from './carousel';

/**
 * We want the event grid to be able to take in the events that we want to display
 * and the size formatting and that's all we need to worry about
 */
interface EventGridProps {
  size: 's' | 'm' | 'l';
  events: Array<Event>;
  filters?: Array<string>;
  showMore?: boolean;
  onFilterRemove: (filter: string) => void;
}

function EventGrid({
  size,
  events,
  filters,
  showMore,
  onFilterRemove,
}: EventGridProps) {
  const onFilterClick = () => {};
  const onShowMoreClick = () => {};

  return (
    <div className={styles.container}>
      {filters && (
        <div className={styles.header}>
          <div className={styles.filterBox}>
            <small> Showing items with the following tags: </small>
            <div className={styles.filters}>
              {filters.map((filter) => (
                <Widget
                  key={filter}
                  text={filter}
                  icon={'times'}
                  iconPosition="right"
                  pressed={true}
                  onChange={() => onFilterRemove(filter)}
                />
              ))}
            </div>
          </div>
          <div className={styles.buttons}>
            <MenuButton></MenuButton>
            <Button icon="filter" onClick={onFilterClick} />
          </div>
        </div>
      )}
      {(size === 'l' && (
        <Carousel
          items={events}
          getKey={(e) => e.id}
          label="Featured events"
          itemLabel="event"
          overlay={false}
          renderItem={(event) => <EventCard size={size} event={event} />}
        />
      )) || (
        <div className={`${styles.eventGrid} ${showMore ? styles.more : ''}`}>
          {events.map((event) => (
            <EventCard key={event.id} size={size} event={event} />
          ))}
        </div>
      )}
      {showMore && <Button text="Show more" onClick={onShowMoreClick} />}
    </div>
  );
}

export default EventGrid;
