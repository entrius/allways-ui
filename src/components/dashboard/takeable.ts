import { useMemo } from 'react';
import { useMiners } from '../../api';
import type { Miner } from '../../api/models/Miners';
import {
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { unitsToHuman } from '../../utils/format';

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
export type Takeable = {
  // Best rate, "to per 1 from".
  rate: number;
  // Active quotes on the direction: how many miners a taker can hit.
  quotes: number;
  // Takeable collateral behind those quotes, per backing purse, in the
  // purse's own units (never summed across purses).
  depth: Record<string, number>;
};
export type TakeableMap = Map<string, Takeable>;

export const takeableKey = (direction: Direction, backing?: string) =>
  backing ? `${direction}|${backing.toLowerCase()}` : direction;

const fold = (
  map: TakeableMap,
  key: string,
  r: number,
  backing: string,
  collateral: number,
) => {
  const cur = map.get(key);
  if (!cur) {
    map.set(key, { rate: r, quotes: 1, depth: { [backing]: collateral } });
    return;
  }
  cur.rate = Math.max(cur.rate, r);
  cur.quotes += 1;
  cur.depth[backing] = (cur.depth[backing] ?? 0) + collateral;
};

export const bestTakeable = (miners: Miner[] | undefined): TakeableMap => {
  const map: TakeableMap = new Map();
  for (const m of miners ?? []) {
    if (!m.isActive || m.hasActiveSwap || m.isReserved) continue;
    if (!m.collateral) continue;
    const src = m.sourceChain?.toLowerCase();
    const dst = m.destChain?.toLowerCase();
    if (!src || !dst) continue;
    const backing = (m.backing ?? src).toLowerCase();
    const collateral = unitsToHuman(m.collateral, backing);
    if (!Number.isFinite(collateral) || collateral <= 0) continue;
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
      fold(map, takeableKey(direction), r, backing, collateral);
      fold(map, takeableKey(direction, backing), r, backing, collateral);
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
  map.get(takeableKey(direction, backing))?.rate ??
  (backing ? null : (map.get(direction)?.rate ?? null));

// Spread between a direction and its way back, on one ruler ("to per 1
// from"), as a percent of their mid. The forward best is what a taker
// gets; the inverse of the reverse best is what the other side asks.
// Negative means the two cross. Null unless both sides are quoted.
export const takeableSpread = (
  map: TakeableMap,
  direction: Direction,
): number | null => {
  const { from, to } = decomposeDirection(direction);
  const reverse = `${to}-${from}`.toUpperCase() as Direction;
  const bid = takeableFor(map, direction);
  const back = takeableFor(map, reverse);
  if (bid == null || back == null || back <= 0) return null;
  const ask = 1 / back;
  return bid + ask > 0 ? ((ask - bid) / ((ask + bid) / 2)) * 100 : null;
};

export const useBestTakeable = () => {
  const { data: miners, dataUpdatedAt, isError, isLoading } = useMiners();
  const map = useMemo(() => bestTakeable(miners), [miners]);
  return { map, miners, dataUpdatedAt, isError, isLoading };
};
