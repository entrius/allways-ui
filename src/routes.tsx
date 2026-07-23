import React from 'react';
import { Navigate, useLocation, type PathRouteProps } from 'react-router-dom';

export type AppRoute = Omit<PathRouteProps, 'path'> & {
  name: string;
  path: string;
};

// The old single-page dashboard split into /market (chart + liquidity) and
// /transactions (explorer). Old links land on the market page with their
// query (e.g. ?pair=BTC) intact.
const LegacyDashboardRedirect: React.FC = () => {
  const { search } = useLocation();
  return <Navigate to={`/market${search}`} replace />;
};

const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const MarketPage = React.lazy(() => import('./pages/MarketPage'));
const TransactionsPage = React.lazy(() => import('./pages/TransactionsPage'));
const MinersPage = React.lazy(() => import('./pages/MinersPage'));
const MinerDetailPage = React.lazy(() => import('./pages/MinerDetailPage'));
const SwapDetailPage = React.lazy(() => import('./pages/SwapDetailPage'));
const ReservationDetailPage = React.lazy(
  () => import('./pages/ReservationDetailPage'),
);
const ReservationsBySourcePage = React.lazy(
  () => import('./pages/ReservationsBySourcePage'),
);
const AgentsPage = React.lazy(() => import('./pages/AgentsPage'));
const NetworkStatsPage = React.lazy(() => import('./pages/NetworkStatsPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

const routesArray: AppRoute[] = [
  { name: 'landing', path: '/', element: <LandingPage /> },
  { name: 'market', path: '/market', element: <MarketPage /> },
  {
    name: 'transactions',
    path: '/transactions',
    element: <TransactionsPage />,
  },
  {
    name: 'dashboard',
    path: '/dashboard',
    element: <LegacyDashboardRedirect />,
  },
  { name: 'miners', path: '/miners', element: <MinersPage /> },
  {
    name: 'miner-detail',
    path: '/miners/:hotkey',
    element: <MinerDetailPage />,
  },
  { name: 'swap-detail', path: '/swap/:swapId', element: <SwapDetailPage /> },
  {
    name: 'reservations-by-source',
    path: '/reservations/by-source/:address',
    element: <ReservationsBySourcePage />,
  },
  {
    name: 'reservation-detail',
    path: '/reservations/:requestHash',
    element: <ReservationDetailPage />,
  },
  { name: 'agents', path: '/agents', element: <AgentsPage /> },
  {
    name: 'network-stats',
    path: '/network-stats',
    element: <NetworkStatsPage />,
  },

  // 404 catch-all route (must be last)
  {
    name: 'not-found',
    path: '*',
    element: <NotFoundPage />,
  },
];

export const routePaths = routesArray.reduce<Record<string, AppRoute>>(
  (acc, x) => {
    acc[x.path] = x;
    return acc;
  },
  {},
);

export default routesArray.reduce<Record<string, AppRoute>>((acc, x) => {
  acc[x.name] = x;
  return acc;
}, {});
