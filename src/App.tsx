import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import routes from './routes';

const App: React.FC = () => (
  <ErrorBoundary>
    <Routes>
      <Route element={<AppLayout />}>
        {Object.values(routes).map((x) => (
          <Route key={x.path} {...x} />
        ))}
      </Route>
    </Routes>
  </ErrorBoundary>
);

export default App;
