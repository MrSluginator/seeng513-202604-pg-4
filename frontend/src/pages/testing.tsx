import { useState } from 'react';
import { Carousel, EventCard } from '../components';
import {
  Button,
  Icon,
  MenuButton,
  Pin,
  RadioGroup,
  Slider,
  TabGroup,
  TextField,
  TextInput,
  ToggleButton,
  Widget,
} from '../molecules';
import EventGrid from '../components/event-grid';
import { Event } from '../components/event-card';

function Testing() {
  const [size, setSize] = useState('md');
  const [tab, setTab] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

  const pins = [
    {
      id: 'cafe-12',
      number: 10,
      label: '10 listings in Beltline',
      x: 120,
      y: 80,
    },
    {
      id: 'cafe-13',
      number: 3,
      label: '3 listings in Kensington',
      x: 260,
      y: 140,
    },
    { id: 'cafe-14', label: 'Saved spot', x: 90, y: 200 }, // no number
  ];

  const start = new Date();
  const end = new Date();
  start.setHours(11);
  end.setHours(15);
  const tags: Array<string> = ['sun', 'dance', 'food', 'drinks', 'rain'];
  const event1: Event = {
    id: '1',
    title: "Sushi",
    summary: "sushi is gay",
    defaultSaved: false,
    rating: 2.3,
    reviews: 120,
    time: {start, end},
    location: 'here',
    tags: tags,
    description: "this is a description about sushi and it's kinda long or something idk guys this is silly",
    imageUrls: ['https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450'],
    imageUrl: 'https://picsum.photos/800/450',
  };
  const event2: Event = {
    id: '2',
    title: "Sushi",
    summary: "sushi is gay",
    defaultSaved: false,
    rating: 2.3,
    reviews: 120,
    time: {start, end},
    location: 'here',
    tags: tags,
    description: "this is a description about sushi and it's kinda long or something idk guys this is silly",
    imageUrls: ['https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450'],
    imageUrl: 'https://picsum.photos/800/450',
  };
  const event3: Event = {
    id: '3',
    title: "Sushi",
    summary: "sushi is gay",
    defaultSaved: true,
    rating: 2.3,
    reviews: 120,
    time: {start, end},
    location: 'here',
    tags: tags,
    description: "this is a description about sushi and it's kinda long or something idk guys this is silly",
    imageUrls: ['https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450'],
    imageUrl: 'https://picsum.photos/800/450',
  };
  const event4: Event = {
    id: '4',
    title: "Sushi",
    summary: "sushi is gay",
    defaultSaved: true,
    rating: 4.8,
    reviews: 500400,
    time: {start, end},
    location: 'here',
    tags: tags,
    description: "this is a description about sushi and it's kinda long or something idk guys this is silly",
    imageUrls: ['https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450'],
    imageUrl: 'https://picsum.photos/800/450',
  };
  const event5: Event = {
    id: '5',
    title: "Sushi",
    summary: "sushi is gay",
    defaultSaved: false,
    rating: 1.4,
    reviews: 10029,
    time: {start, end},
    location: 'here',
    tags: tags,
    description: "this is a description about sushi and it's kinda long or something idk guys this is silly",
    imageUrls: ['https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450'],
    imageUrl: 'https://picsum.photos/800/450',
  };
  const event6: Event = {
    id: '6',
    title: "Sushi",
    summary: "sushi is gay",
    defaultSaved: false,
    rating: 2.6,
    reviews: 2340,
    time: {start, end},
    location: 'here',
    tags: tags,
    description: "this is a description about sushi and it's kinda long or something idk guys this is silly",
    imageUrls: ['https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450', 'https://picsum.photos/800/450'],
    imageUrl: 'https://picsum.photos/800/450',
  };
  const events: Array<Event> = [
    event1, event2, event3, event4, event5, event6,
  ];
  return (
    <div>
      <h1>Flare</h1>
      <p>Welcome to Flare! React frontend is initialized.</p>
      <EventGrid size='m' events={events} showMore={true} filters={tags} onFilterRemove={() => {}}/>
      <EventGrid size='s' events={events} onFilterRemove={() => {}}/>
      <EventGrid size='l' events={events} filters={tags} onFilterRemove={() => {}}/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <EventCard
            size='m'
            event={event4}
          />
          <EventCard
            size='m'
            event={event1}
          />
        </div>
        <div
          style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <EventCard
            size="s"
            event={event1}
          />
          <EventCard
            size="s"
            event={event4}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <EventCard
            size="l"
            event={event4}
          />
          <EventCard
            size="l"
            event={event2}
          />
        </div>
        <div
          style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <EventCard
            size="xl"
            event={event4}
          />
          <EventCard
            size="xl"
            event={event2}
          />
        </div>
      </div>
      testing components
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        Buttons:
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button text="Hello"></Button>
          <Button icon="filter"></Button>
          <Button icon="left" iconPosition="left" text="left"></Button>
          <Button text="right" icon="right" disabled={true}></Button>
        </div>
        <MenuButton></MenuButton>
        <RadioGroup
          value={size}
          onChange={setSize}
          options={[
            { value: 's', label: 'Small' },
            { value: 'm', label: 'Medium' },
            { value: 'l', label: 'Large' },
            { value: 'xl', label: 'Extra large', disabled: true },
          ]}
        />
        <TabGroup
          value={tab}
          onChange={setTab}
          options={[
            { value: 0, label: 'Tab 1' },
            { value: 1, label: 'Tab 2' },
            { value: 2, label: 'Tab 3', disabled: true },
          ]}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <ToggleButton></ToggleButton>
          <ToggleButton disabled={true}></ToggleButton>
          <ToggleButton disabled={true} pressed={true}></ToggleButton>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        Text:
        <TextField label="text field" placeholder="Enter some text"></TextField>
        <TextField placeholder="Enter some text" disabled={true}></TextField>
        <TextInput label="input field" placeholder="Typing..."></TextInput>
        <TextInput placeholder="Typing..." disabled={true}></TextInput>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Icon name="food" size="m"></Icon>
        <div style={{ display: 'flex', gap: '10px' }}>
          {pins.map((pin) => (
            <Pin
              key={pin.id}
              number={pin.count}
              selected={selectedId === pin.id}
              onClick={() => setSelectedId(pin.id)}
              onDeselect={() => setSelectedId(null)}
            />
          ))}
        </div>
        <Slider
          min={0}
          max={100}
          defaultValue={14}
          majorSteps={5}
          minorSteps={1}
        />
        <Slider min={0} max={24} defaultValue={[10, 18]} />
        <Slider
          min={0}
          max={200}
          defaultValue={100}
          disabled={true}
          labelsPosition="top"
        />
        <Slider
          min={5}
          max={10}
          step={0.1}
          defaultValue={[5.6, 7]}
          labelsPosition="top"
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <Widget text="text"></Widget>
          <Widget icon="food"></Widget>
          <Widget icon="food" text="food"></Widget>
        </div>
      </div>
    </div>
  );
}

export default Testing;
