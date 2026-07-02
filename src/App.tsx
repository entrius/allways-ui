import React, { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout';
import routes from './routes';
import GateAppLayout from './app-gate/GateAppLayout';
import RequireMembership from './app-gate/RequireMembership';

// Allways Access — the standalone, gated validator app. Self-contained route
// group with its own layout (sidebar shell), kept separate from the dashboard.
const AppLandingPage = lazy(() => import('./app-gate/pages/AppLandingPage'));
const OverviewPage = lazy(() => import('./app-gate/pages/OverviewPage'));
const ExchangePage = lazy(() => import('./app-gate/pages/ExchangePage'));
const SwapsPage = lazy(() => import('./app-gate/pages/SwapsPage'));
const WalletsPage = lazy(() => import('./app-gate/pages/WalletsPage'));
const LimitsPage = lazy(() => import('./app-gate/pages/LimitsPage'));
const BillingPage = lazy(() => import('./app-gate/pages/BillingPage'));

const gated = (el: React.ReactNode) => (
  <RequireMembership>{el}</RequireMembership>
);

const App: React.FC = () => (
  <Routes>
    <Route element={<AppLayout />}>
      {Object.values(routes).map((x) => (
        <Route key={x.path} {...x} />
      ))}
    </Route>

    <Route path="/app" element={<GateAppLayout />}>
      <Route index element={<AppLandingPage />} />
      <Route path="overview" element={gated(<OverviewPage />)} />
      <Route path="exchange" element={gated(<ExchangePage />)} />
      <Route path="swaps" element={gated(<SwapsPage />)} />
      <Route path="wallets" element={gated(<WalletsPage />)} />
      <Route path="limits" element={gated(<LimitsPage />)} />
      <Route path="billing" element={gated(<BillingPage />)} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Route>
  </Routes>
);

export default App;
