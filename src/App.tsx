import React from 'react';
import { Route, Routes } from 'react-router-dom';
import routes from './routes';

const App: React.FC = () => (
  <Routes>
    {Object.values(routes).map((x) => (
      <Route key={x.path} {...x} />
    ))}
  </Routes>
);

export default App;
