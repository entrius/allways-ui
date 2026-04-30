import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type ProtocolConstants } from './models';

// Constants are immutable contract values — fetch once, cache long.
const ONE_HOUR_MS = 60 * 60 * 1000;

export const useProtocolConstants = () =>
  useApiQuery<ProtocolConstants>(
    'protocolConstants',
    '/protocol/constants',
    ONE_HOUR_MS,
  );

export const useChainState = () =>
  useApiQuery<{ currentBlock: number }>(
    'chainState',
    '/protocol/chain-state',
    SSE_FALLBACK_INTERVAL,
  );
