import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type Miner } from './models';

export const useMiners = () =>
  useApiQuery<Miner[]>(
    'miners',
    '/miners',
    SSE_FALLBACK_INTERVAL,
  );
