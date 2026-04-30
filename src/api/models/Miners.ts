/**
 * Miner commitment data.
 *
 * (sourceChain, destChain) is in canonical order: TAO is always destChain when
 * present; otherwise the ordering is alphabetical. Both rates are "dest per 1
 * source" under that canonical order (e.g. TAO per 1 BTC).
 *
 *   rate         → source→dest rate (e.g. BTC→TAO)
 *   counterRate  → dest→source rate (e.g. TAO→BTC), same unit as rate
 *
 * Either rate may be "0" (or null) to indicate that direction is disabled.
 * A miner with both rates = 0 is filtered out by the API.
 */
export type Miner = {
  uid: number;
  hotkey: string;
  sourceChain: string | null;
  destChain: string | null;
  rate: string | null;
  counterRate: string | null;
  collateralRao: string;
  isActive: boolean;
  isReserved: boolean;
  hasActiveSwap: boolean;
  updatedAt: string;
};
