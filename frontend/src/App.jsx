import { NavBar } from './components';
import { Routes, Route } from 'react-router-dom';
import { HeatMap, Landing, PostEvent, Saved, Settings, SignIn } from './pages';

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
        </Routes>
      </div>
    </div>
  );
}

export default App;
