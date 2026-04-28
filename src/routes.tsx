import React from 'react';
import { type PathRouteProps } from 'react-router-dom';

export type AppRoute = Omit<PathRouteProps, 'path'> & {
  name: string;
  path: string;
};

const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const SwapPage = React.lazy(() => import('./pages/SwapPage'));
const SwapDetailPage = React.lazy(() => import('./pages/SwapDetailPage'));
const AgentsPage = React.lazy(() => import('./pages/AgentsPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

const routesArray: AppRoute[] = [
  { name: 'landing', path: '/', element: <LandingPage /> },
  { name: 'dashboard', path: '/dashboard', element: <DashboardPage /> },
  { name: 'swap', path: '/swap', element: <SwapPage /> },
  { name: 'swap-detail', path: '/swap/:swapId', element: <SwapDetailPage /> },
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
