import React from 'react';
import {Button, MenuButton, RadioButton, TabButton, ToggleButton, TextField, TextInput, Icon, Pin, Slider, Widget} from './molecules'

function App() {
  return (
    <div className="App">
      <h1>Flare</h1>
      <p>Welcome to Flare! React frontend is initialized.</p>
      
      testing components
      <div>
        Buttons:
        <div style={{ display:"flex", flexDirection: "row" }}>
        <Button text="Hello"></Button>
        <Button icon="filter"></Button>
        <Button icon="left" icon_position="left" text="left"></Button>
        <Button text="right" icon="right"></Button>
        </div>
        <MenuButton></MenuButton>
        <RadioButton></RadioButton>
        <TabButton></TabButton>
        <ToggleButton></ToggleButton>
      </div>
      <div>
        Text:
        <TextField></TextField>
        <TextInput></TextInput>
      </div>
      <Icon></Icon>
      <Pin></Pin>
      <Slider></Slider>
      <Widget></Widget>
    </div>
  );
}

export default App;
