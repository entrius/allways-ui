/**
 * Miner commitment data.
 *
 * (sourceChain, destChain) is in canonical order: the hub chain (SOL) is pinned
 * as the canonical source; the spoke (BTC/TAO) is the counter leg. Both rates
 * are "dest per 1 source" under that canonical order.
 *
 *   rate         → source→dest rate
 *   counterRate  → dest→source rate, same unit as rate
 *
 * Either rate may be "0" (or null) to indicate that direction is disabled.
 * A miner with both rates = 0 is filtered out by the API.
 */
export type Miner = {
  uid: number;
  hotkey: string;
  solanaPubkey: string | null;
  sourceChain: string | null;
  sourceAddress: string | null;
  destChain: string | null;
  destAddress: string | null;
  rate: string | null;
  counterRate: string | null;
  collateral: string;
  isActive: boolean;
  isReserved: boolean;
  hasActiveSwap: boolean;
  updatedAt: string;
};
