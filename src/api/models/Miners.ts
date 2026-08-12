/**
 * Miner commitment data.
 *
 * (sourceChain, destChain) is in canonical order: the pair's hub leg (SOL or
 * TAO, hub-priority order) is pinned as the canonical source; the spoke is
 * the counter leg. Both rates are "dest per 1 source" under that order.
 *
 *   rate         → source→dest rate
 *   counterRate  → dest→source rate, same unit as rate
 *
 * Either rate may be "0" (or null) to indicate that direction is disabled.
 * A miner with both rates = 0 is filtered out by the API.
 */
export type Miner = {
  // Real Bittensor metagraph uid; null when the hotkey is not registered on
  // the metagraph (or the indexer couldn't resolve it).
  uid: number | null;
  hotkey: string;
  // The quote's collateral chain ('sol' | 'tao'). Part of the row's identity:
  // one miner may stand a sol- AND a tao-backed quote on the same direction.
  backing: string;
  solanaPubkey: string | null;
  sourceChain: string | null;
  sourceAddress: string | null;
  destChain: string | null;
  destAddress: string | null;
  rate: string | null;
  counterRate: string | null;
  collateral: string;
  // Largest swap this miner can actually back — bond / 1.10 in the BACKING
  // asset's smallest unit (lamports for 'sol', rao for 'tao'), and "0" when
  // that purse is inactive. Read this, not `rate`, to judge available depth.
  fundableUpTo: string;
  isActive: boolean;
  isReserved: boolean;
  hasActiveSwap: boolean;
  updatedAt: string;
};

// True iff the miner's pair is exactly {a, b}, orientation-blind. Filter with
// this, never by spoke alone: with two hubs, a sol↔eth and a tao↔eth quote
// share a spoke but are different markets.
export const minerServesPair = (
  m: Pick<Miner, 'sourceChain' | 'destChain'>,
  a: string,
  b: string,
): boolean => {
  const src = m.sourceChain?.toLowerCase();
  const dst = m.destChain?.toLowerCase();
  if (!src || !dst) return false;
  return (
    (src === a.toLowerCase() && dst === b.toLowerCase()) ||
    (src === b.toLowerCase() && dst === a.toLowerCase())
  );
};
