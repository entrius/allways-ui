import { useApiQuery, useApiQueryAllPages } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type ActiveSwap, type SwapDetail } from './models';

// Every swap ever, walked page-by-page (the backend caps /swaps at 50/page).
// The network stats page derives per-day peak concurrency and serving-node
// counts from each swap's [initiatedAt, resolvedAt] interval — levels the
// edge-sampled /history/state endpoint can't provide.
// The whole tape, walked in 200-row pages (the server's cap). Only for
// consumers that genuinely need every row — the explorer filters and sorts
// server-side and never calls this.
export const useCompleteSwapHistory = (enabled?: boolean) =>
  useApiQueryAllPages<ActiveSwap>(
    'completeSwapHistory',
    '/swaps',
    200,
    25,
    SSE_FALLBACK_INTERVAL,
    enabled,
  );

// The explorer's server-side query: the same narrowing rules for the page of
// rows and for the count the pager reckons pages against.
export type SwapQuery = {
  search?: string;
  seq?: number;
  status?: string;
  fromChain?: string;
  toChain?: string;
  // Unix seconds; the client sends its own local-day bounds.
  timeFrom?: number;
  timeTo?: number;
  // Backing-leg notional, human units.
  minNotional?: number;
  maxNotional?: number;
};

export const useActiveSwaps = () =>
  useApiQuery<ActiveSwap[]>('swaps', '/swaps/active', SSE_FALLBACK_INTERVAL);

export const useAllSwaps = (
  params?: SwapQuery & {
    limit?: number;
    offset?: number;
    sort?: string;
    dir?: 'asc' | 'desc';
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

// With no argument this is the all-time total; with a query it's how many
// rows those filters match.
export const useSwapsCount = (params?: SwapQuery) =>
  useApiQuery<{ totalCount: number }>(
    'swapsCount',
    '/swaps/count',
    SSE_FALLBACK_INTERVAL,
    params as Record<string, string | number | undefined> | undefined,
  );

export const useSwapDetail = (swapId: string) =>
  useApiQuery<SwapDetail>(
    'swap',
    `/swaps/${swapId}`,
    SSE_FALLBACK_INTERVAL,
    undefined,
    !!swapId,
  );
