import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type ActiveSwap, type SwapDetail } from './models';

export const useActiveSwaps = (filters?: {
  userAddress?: string;
  minerHotkey?: string;
}) =>
  useApiQuery<ActiveSwap[]>(
    'swaps',
    '/swaps/active',
    SSE_FALLBACK_INTERVAL,
    filters,
  );

export const useSwapDetail = (swapId: string) =>
  useApiQuery<SwapDetail>(
    'swap',
    `/swaps/${swapId}`,
    SSE_FALLBACK_INTERVAL,
    undefined,
    !!swapId,
  );
