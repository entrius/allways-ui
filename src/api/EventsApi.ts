import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type ContractEvent } from './models';

export const useLatestEvents = (filters?: {
  eventType?: string;
  minerHotkey?: string;
  userAddress?: string;
}) =>
  useApiQuery<ContractEvent[]>(
    'events',
    '/events/latest',
    SSE_FALLBACK_INTERVAL,
    { limit: 50, ...filters },
  );
