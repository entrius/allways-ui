import React from 'react';
import { type PathRouteProps } from 'react-router-dom';

export type AppRoute = Omit<PathRouteProps, 'path'> & {
  name: string;
  path: string;
};

const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const SwapDetailPage = React.lazy(() => import('./pages/SwapDetailPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

const routesArray: AppRoute[] = [
  { name: 'dashboard', path: '/', element: <DashboardPage /> },
  { name: 'swap-detail', path: '/swap/:swapId', element: <SwapDetailPage /> },

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
