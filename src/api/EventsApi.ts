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

// Every HaltSet the contract has emitted, for marking halted stretches on the
// stats charts. A handful a month, so one page covers the whole history.
export const useHaltHistory = () =>
  useApiQuery<ContractEvent[]>('halt-history', '/events', 5 * 60_000, {
    eventType: 'HaltSet',
    limit: 500,
  });
