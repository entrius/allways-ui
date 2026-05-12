import React from 'react';
import { type PathRouteProps } from 'react-router-dom';

export type AppRoute = Omit<PathRouteProps, 'path'> & {
  name: string;
  path: string;
};

const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const MinersPage = React.lazy(() => import('./pages/MinersPage'));
const SwapPage = React.lazy(() => import('./pages/SwapPage'));
const SwapDetailPage = React.lazy(() => import('./pages/SwapDetailPage'));
const ReservationDetailPage = React.lazy(
  () => import('./pages/ReservationDetailPage'),
);
const ReservationsBySourcePage = React.lazy(
  () => import('./pages/ReservationsBySourcePage'),
);
const AgentsPage = React.lazy(() => import('./pages/AgentsPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

const routesArray: AppRoute[] = [
  { name: 'landing', path: '/', element: <LandingPage /> },
  { name: 'dashboard', path: '/dashboard', element: <DashboardPage /> },
  { name: 'miners', path: '/miners', element: <MinersPage /> },
  { name: 'miner-detail', path: '/miners/:hotkey', element: <MinersPage /> },
  { name: 'swap', path: '/swap', element: <SwapPage /> },
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
