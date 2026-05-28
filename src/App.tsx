import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout';
import routes from './routes';
import { WalletProvider } from './wallet/WalletProvider';

const App: React.FC = () => (
  <WalletProvider>
    <Routes>
      <Route element={<AppLayout />}>
        {Object.values(routes).map((x) => (
          <Route key={x.path} {...x} />
        ))}
      </Route>
    </Routes>
  </WalletProvider>
);

export default App;
