import { useState } from "react";
import { EventCard, ImageCarousel } from "../components";
import { Button, Icon, MenuButton, Pin, RadioGroup, Slider, TabGroup, TextField, TextInput, ToggleButton, Widget } from "../molecules";

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

  const start = new Date()
  const end = new Date();
  start.setHours(11);
  end.setHours(15);
  const tags: Array<string> = [
    'sun',
    'dance',
    'food',
    'drinks',
    'rain',
  ];
  return (
    <div>
      <h1>Flare</h1>
      <p>Welcome to Flare! React frontend is initialized.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{display: 'flex', gap: '20px'}}>
      <EventCard id='this' title='Sushi' summary='sushi is gay' rating={4.5} defaultSaved={true} imageUrl={'d'}></EventCard>
      <EventCard id='that' title='Sushi' summary='sushi is gay' defaultSaved={false} rating={2.3} imageUrl={'gay'}></EventCard>
      </div>
      <div style={{display: 'flex', gap: '20px'}}>
      <EventCard size='s' id='this' title='Sushi' rating={4.5} defaultSaved={true} tags={tags} time={{start, end}} location={"here"} price={{low: 10, high: 35}}></EventCard>
      <EventCard size='s' id='that' title='Sushi' defaultSaved={false} rating={2.3} tags={tags} time={new Date()} location={"there"}></EventCard>
      </div>
       <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
      <EventCard size='l' id='this' title='Sushi' rating={4.5} defaultSaved={true} description={'this is an event description yay'} time={{start, end}} tags={tags} reviews={102} location={"here"} imageUrl={'d'} price={{low: 10, high: 35}}></EventCard>
      <EventCard size='l' id='that' title='Sushi' defaultSaved={false} rating={2.3} description={'this is an event description yay'} time={new Date()} tags={tags} reviews={2300} location={"there"} imageUrl={'d'}></EventCard>
      </div>
       <div style={{display: 'flex', gap: '20px'}}>
      <EventCard size='xl' id='this' title='Sushi' rating={4.5} defaultSaved={true} description={'this is an event description yay'} tags={tags} time={{start, end}} reviews={102} location={"here"} imageUrls={['d', 'a', 'b']} price={{low: 10, high: 35}}></EventCard>
      <EventCard size='xl' id='that' title='Sushi' defaultSaved={false} rating={2.3} description={'this is an event description yay'} tags={tags} time={new Date()} reviews={2300} location={"there"} imageUrls={['d', 'a', 'b', 'c', 'e']}></EventCard>
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
        <ImageCarousel title="test images" images={['https://cdn.britannica.com/22/187222-050-07B17FB6/apples-on-a-tree-branch.jpg','b','c','d','e','f']}/>
      </div>
    </div>
  );
}

export default Testing;