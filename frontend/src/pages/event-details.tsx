import { useParams, useSearchParams } from 'react-router-dom';
import styles from '../assets/styles/event-details.module.css';
import { EventCard } from '../components';
import { Event } from '../components/event-card';

function getEvent(id: string): Event | null {
  return {} as Event;
}

type User = {
  id: string,
  
}

function Rating({}: {user: User}) {
return 
}

function EventDetails() {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return <div>
      Please return to home page, no event selected.
    </div>
  }

  const event = getEvent(id!);
  if (!event) {
    return <div>
      Please return to home page, no event with id '{id}' found.
    </div>
  }

  return (
    <div className={'column'}>
      <div className={styles.content}>
        <EventCard size='xl' event={event}/>
        <div className={styles.details}>
          <div>
            map
          </div>
          <div>
            timeline
          </div>
          <div className={styles.ratings}>

          </div>
        </div>
      </div>
      <div>Footer</div>
    </div>
  );
}

export default EventDetails;
