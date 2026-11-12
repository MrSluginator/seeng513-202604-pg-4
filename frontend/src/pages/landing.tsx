import { useState } from 'react';
import Footer from '../assets/components/footer';

import {
  Button,
  MenuButton,
  ToggleButton,
  TextField,
  TextInput,
  Icon,
  Pin,
  RadioGroup,
  Slider,
  Widget,
  TabGroup,
} from '../molecules';

function Landing() {
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

  return (
    <div>
      <h1>Flare</h1>
      <p>Welcome to Flare! React frontend is initialized.</p>
      testing components
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        Buttons:
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button text="Hello"></Button>
          <Button icon="filter"></Button>
          <Button icon="left" iconPosition="left" text="left"></Button>
          <Button text="right" icon="right"></Button>
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

    <Footer />
    </div>
  );
}

export default Landing;
