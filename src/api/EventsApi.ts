import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type ContractEvent } from './models';

export const useLatestEvents = () =>
  useApiQuery<ContractEvent[]>(
    'events',
    '/events/latest',
    SSE_FALLBACK_INTERVAL,
    { limit: 50 },
  );
