
import { useState } from 'react';
import EventCard, { type SearchEvent } from './event-card';
import styles from '../assets/styles/event-search.module.css';

const sampleEvents: SearchEvent[] = [
  {
    id: '1',
    title: 'Calgary Night Market',
    description: 'Explore local food, music, and vendors.',
    category: 'Food & Drink',
    location: 'Downtown Calgary',
  },
  {
    id: '2',
    title: 'Live Music Festival',
    description: 'Enjoy live performances and entertainment.',
    category: 'Nightlife',
    location: 'Calgary',
  },
  {
    id: '3',
    title: 'Art Workshop',
    description: 'Get creative with local artists.',
    category: 'Culture',
    location: 'Calgary',
  },
  {
    id: '4',
    title: 'Outdoor Adventure',
    description: 'Discover fun outdoor activities.',
    category: 'Activities',
    location: 'Calgary',
  },
];

function EventSearch() {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredEvents = sampleEvents.filter((event) => {
    const query = search.toLowerCase().trim();

    return (
      event.title.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query) ||
      event.category.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query)
    );
  });

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchBar}>
        <input
          type="search"
          placeholder="Search events..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          aria-label="Search events"
        />

        <button
          type="button"
          className={styles.searchButton}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle event search"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 5 5" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className={styles.popup}>
          <div className={styles.popupHeader}>
            <h2>Search Events</h2>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={styles.closeButton}
              aria-label="Close search results"
            >
              ×
            </button>
          </div>

          <p className={styles.resultCount}>
            {filteredEvents.length} matching events
          </p>

          {filteredEvents.length > 0 ? (
            <div className={styles.eventGrid}>
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className={styles.emptyMessage}>
              No events found. Try another search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default EventSearch;
