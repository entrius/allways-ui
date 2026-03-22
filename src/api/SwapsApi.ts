import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type ActiveSwap } from './models';

export const useActiveSwaps = () =>
  useApiQuery<ActiveSwap[]>(
    'swaps',
    '/swaps/active',
    SSE_FALLBACK_INTERVAL,
  );
