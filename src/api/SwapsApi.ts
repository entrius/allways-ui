import { useApiQuery, useApiQueryAllPages } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type ActiveSwap, type SwapDetail } from './models';

// Every swap ever, walked page-by-page (the backend caps /swaps at 50/page).
// The network stats page derives per-day peak concurrency and serving-node
// counts from each swap's [initiatedAt, resolvedAt] interval — levels the
// edge-sampled /history/state endpoint can't provide.
export const useCompleteSwapHistory = () =>
  useApiQueryAllPages<ActiveSwap>(
    'completeSwapHistory',
    '/swaps',
    50,
    40,
    SSE_FALLBACK_INTERVAL,
  );

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
