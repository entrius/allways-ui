import { useMemo } from 'react';
import { useMiners } from '../../api';
import type { Miner } from '../../api/models/Miners';
import {
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';

// The best TAKEABLE rate per direction: the top of the order book, from the
// same miner list the book draws. Only collateral hittable this instant
// counts (active miners that are not reserved or mid-swap, with collateral),
// exactly the book's rule, so the sheet, the rate card and the watchlist
// print the number a taker would actually get, and agree with the book's
// top level. The crown is the validator's award, not the market: a
// direction can have a live quote and no crown holder, and a dash there
// hid a market.
//
// Rates are "to per 1 from" (directionalRateFor). Keys are `DIR` for the
// best across every backing and `DIR|backing` for one funding purse: a
// spoke pair has one purse (its hub), the hub↔hub pair has one per hub.
export type TakeableMap = Map<string, number>;

export const takeableKey = (direction: Direction, backing?: string) =>
  backing ? `${direction}|${backing.toLowerCase()}` : direction;

const better = (map: TakeableMap, key: string, r: number) => {
  const cur = map.get(key);
  if (cur == null || r > cur) map.set(key, r);
};

export const bestTakeable = (miners: Miner[] | undefined): TakeableMap => {
  const map: TakeableMap = new Map();
  for (const m of miners ?? []) {
    if (!m.isActive || m.hasActiveSwap || m.isReserved) continue;
    if (!m.collateral || Number(m.collateral) <= 0) continue;
    const src = m.sourceChain?.toLowerCase();
    const dst = m.destChain?.toLowerCase();
    if (!src || !dst) continue;
    const backing = (m.backing ?? src).toLowerCase();
    // Both directions of the miner's pair. As in the book: the direction
    // whose leg is the canonical (hub-anchored) one reads the row's rate,
    // the way back reads its counterRate; directionalRateFor turns each
    // into "to per 1 from".
    for (const direction of [
      `${src}-${dst}`.toUpperCase() as Direction,
      `${dst}-${src}`.toUpperCase() as Direction,
    ]) {
      const { leg } = decomposeDirection(direction);
      const raw = leg === 'reverse' ? m.counterRate : m.rate;
      const r = directionalRateFor(direction, raw);
      if (r == null || !Number.isFinite(r) || r <= 0) continue;
      better(map, takeableKey(direction), r);
      better(map, takeableKey(direction, backing), r);
    }
  }
  return map;
};

/** Best takeable rate for a direction (to per 1 from), on one backing purse
 * when given, else across every purse. Null when no one is quoting it. */
export const takeableFor = (
  map: TakeableMap,
  direction: Direction,
  backing?: string,
): number | null =>
  map.get(takeableKey(direction, backing)) ??
  (backing ? null : (map.get(direction) ?? null));

export const useBestTakeable = () => {
  const { data: miners, dataUpdatedAt, isError, isLoading } = useMiners();
  const map = useMemo(() => bestTakeable(miners), [miners]);
  return { map, miners, dataUpdatedAt, isError, isLoading };
};
