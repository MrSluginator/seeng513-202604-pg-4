import { Button, MenuButton, TextInput, Widget } from '../molecules';
// @ts-ignore CSS modules are resolved by the frontend bundler.
import styles from '../assets/styles/event-grid.module.css';
import EventCard, { Event } from './event-card';
import Carousel from './carousel';
import { useIsDesktop, useIsMobile } from '../../util/media-query';
import { useState } from 'react';

interface CarouselProps {
  type: 'carousel';
  controls: boolean;
}

interface GridProps {
  type: 'grid';
  hidden: boolean;
}

/**
 * We want the event grid to be able to take in the events that we want to display
 * and the size formatting and that's all we need to worry about
 */
interface EventGridProps {
  size: 's' | 'm' | 'l';
  events: Array<Event>;
  display: GridProps | CarouselProps;
  filters?: Array<string>;
  onFilterRemove: (filter: string) => void;
}

function EventGrid({
  size,
  events,
  display,
  filters,
  onFilterRemove,
}: EventGridProps) {
  const [hidden, setHidden] = useState(
    display.type === 'grid' && display.hidden
  );

  const onFilterClick = () => {};
  const onShowMore = () => setHidden((prev) => !prev);
  const isDesktop = useIsDesktop();
  const isMobile = useIsMobile();

  return (
    <div className={`${styles.container} ${styles[size]}`}>
      {filters && (
        <div className={styles.header}>
          {isDesktop && (
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
          )}
          {isMobile && (
            <TextInput
              className={styles.search}
              placeholder="search for events, activites..."
              icon="search"
            />
          )}
          <div className={styles.buttons}>
            {isDesktop && <MenuButton />}
            <Button icon="filter" onClick={onFilterClick} />
          </div>
        </div>
      )}
      {display.type === 'carousel' && (
        <Carousel
          className={styles.carousel}
          items={events}
          getKey={(e) => e.id}
          label="Featured events"
          itemLabel="event"
          overlay={false}
          showControls={display.controls}
          renderItem={(event) => <EventCard size={size} event={event} />}
        />
      )}
      {display.type === 'grid' && (
        <div className={styles.grid}>
          <div
            className={styles.eventGrid}
            style={{
              maxHeight: hidden ? 480 : 'none',
              overflow: hidden ? 'hidden' : 'visible',
            }}
          >
            {events.map((event) => (
              <EventCard key={event.id} size={size} event={event} />
            ))}
          </div>
          {display.hidden && (
            <Button
              text={!hidden ? 'Show less' : 'Show more'}
              onClick={onShowMore}
              icon={!hidden ? 'up' : 'down'}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default EventGrid;
