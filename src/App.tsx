import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout';
import routes from './routes';

const App: React.FC = () => (
  <Routes>
    <Route element={<AppLayout />}>
      {Object.values(routes).map((x) => (
        <Route key={x.path} {...x} />
      ))}
    </Route>
  </Routes>
);

export default App;
