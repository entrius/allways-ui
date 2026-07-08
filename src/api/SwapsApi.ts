import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type ActiveSwap, type SwapDetail } from './models';

export const useActiveSwaps = () =>
  useApiQuery<ActiveSwap[]>('swaps', '/swaps/active', SSE_FALLBACK_INTERVAL);

export const useAllSwaps = (
  params?: {
    search?: string;
    // Exact transaction number (the display "#N", not the int64 swapId).
    seq?: number;
    limit?: number;
    offset?: number;
  },
  enabled?: boolean,
) =>
  useApiQuery<ActiveSwap[]>(
    'allSwaps',
    '/swaps',
    SSE_FALLBACK_INTERVAL,
    params,
    enabled,
  );

export const useSwapsCount = () =>
  useApiQuery<{ totalCount: number }>(
    'swapsCount',
    '/swaps/count',
    SSE_FALLBACK_INTERVAL,
  );

export const useSwapDetail = (swapId: string) =>
  useApiQuery<SwapDetail>(
    'swap',
    `/swaps/${swapId}`,
    SSE_FALLBACK_INTERVAL,
    undefined,
    !!swapId,
  );
