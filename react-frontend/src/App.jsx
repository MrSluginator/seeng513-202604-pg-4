import { NavBar } from './components';
import { Routes, Route } from 'react-router-dom';
import {
  EventDetails,
  HeatMap,
  Landing,
  NotFound,
  PostEvent,
  Saved,
  Settings,
  SignIn,
  Testing,
} from './pages';

function App() {
  return (
    <div className="App">
      <NavBar signedIn={false}></NavBar>
      <div className="page">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/map" element={<HeatMap />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/post" element={<PostEvent />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/sign_in" element={<SignIn />} />
          <Route path="/event/:id" element={<EventDetails />} />
          <Route path="/testing" element={<Testing />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
