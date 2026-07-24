import { ALL_DIRECTIONS, type Direction, type Range } from './MinersDashboard';

// Crown-grid window mode lives only on the URL — not on any API contract —
// so the type lives here next to the search-param guards that read it.
export type CrownRange = '1h' | '2h' | '4h';
// Mirrors the leaderboard's lookback set so every panel on the miners page
// offers the same windows. The API clamps the rate/crown-time source
// (crown_holders, pruned at ~4d), so 7d/30d render the data that exists.
export type RateRange = '1h' | '24h' | '7d' | '30d';

// 90d/all dropped: the API clamps every range to ~30d (MAX_LOOKBACK_SECS),
// so they were redundant with 30d. A stale ?range=90d/all URL now falls back
// to the 30d default. The Range type keeps them for API back-compat.
const RANGES: readonly Range[] = ['1h', '24h', '7d', '30d'];
const CROWN_RANGES: readonly CrownRange[] = ['1h', '2h', '4h'];
const RATE_RANGES: readonly RateRange[] = ['1h', '24h', '7d', '30d'];

export const isRange = (v: string | null): v is Range =>
  RANGES.includes((v ?? '') as Range);

export const isDirection = (v: string | null): v is Direction =>
  ALL_DIRECTIONS.includes((v ?? '') as Direction);

export const isCrownRange = (v: string | null): v is CrownRange =>
  CROWN_RANGES.includes((v ?? '') as CrownRange);

export const isRateRange = (v: string | null): v is RateRange =>
  RATE_RANGES.includes((v ?? '') as RateRange);

// Parses a non-negative-integer URL param (unix-seconds bounds for the crown
// grid's custom range).
export const parseTsParam = (v: string | null): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
};
