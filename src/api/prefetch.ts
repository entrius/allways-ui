import { useCallback } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiQueryOptions } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import type { ActiveSwap } from './models';
import { DEFAULT_PAGE_SIZE } from '../components/dashboard/txFilters';

// Route warm-up. A tab click costs two round trips the user watches: the
// route's JS chunk, then its first query. Both can start on the intent to
// click (pointer entering the link, or focus) instead of the click itself,
// which is most of the wait on a fast connection.
//
// Each entry warms ONLY what the page paints first — the rows, not the
// counts, labels, or anything below the fold — so hovering a tab you never
// click costs one request.
const PREFETCH: Record<string, (client: QueryClient) => void> = {
  '/network': (client) => {
    void import('../pages/NetworkPage');
    void client.prefetchQuery(
      // Must mirror SwapTracker's default page query exactly, or the tape
      // opens on a cache miss and refetches: newest first, page one.
      {
        ...apiQueryOptions<ActiveSwap[]>(
          'allSwaps',
          '/swaps',
          SSE_FALLBACK_INTERVAL,
          { limit: DEFAULT_PAGE_SIZE, offset: 0, dir: 'desc' },
        ),
        // The client's default staleTime is 0, which would make every pass of
        // the pointer across the nav bar refetch. One warm-up per SSE fallback
        // window is the point; SSE still invalidates on real activity.
        staleTime: SSE_FALLBACK_INTERVAL,
      },
    );
  },
};

/** Returns a handler that warms a route's chunk and first query, if it has one. */
export const useRoutePrefetch = (): ((to?: string) => void) => {
  const client = useQueryClient();
  return useCallback(
    (to?: string) => {
      if (to) PREFETCH[to]?.(client);
    },
    [client],
  );
};
