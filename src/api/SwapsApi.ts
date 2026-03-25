import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type ActiveSwap, type SwapDetail } from './models';

export const useActiveSwaps = () =>
  useApiQuery<ActiveSwap[]>('swaps', '/swaps/active', SSE_FALLBACK_INTERVAL);

export const useAllSwaps = (params?: {
  search?: string;
  limit?: number;
  offset?: number;
}) =>
  useApiQuery<ActiveSwap[]>(
    'allSwaps',
    '/swaps',
    SSE_FALLBACK_INTERVAL,
    params,
  );

export const useSwapDetail = (swapId: string) =>
  useApiQuery<SwapDetail>(
    'swap',
    `/swaps/${swapId}`,
    SSE_FALLBACK_INTERVAL,
    undefined,
    !!swapId,
  );
