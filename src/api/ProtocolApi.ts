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

// Chain head is time-native now: `asOf` is unix seconds (MAX block_time over
// contract events); `slot` is the latest Solana slot, when the API includes it.
export const useChainState = () =>
  useApiQuery<{ asOf: number; slot?: number }>(
    'chainState',
    '/protocol/chain-state',
    SSE_FALLBACK_INTERVAL,
  );
