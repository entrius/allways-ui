import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type DashboardStats } from './models';

export const useStats = () =>
  useApiQuery<DashboardStats>(
    'stats',
    '/stats',
    SSE_FALLBACK_INTERVAL,
  );
