import type { Direction, Range } from './MinersDashboard';

// Crown-grid window mode lives only on the URL — not on any API contract —
// so the type lives here next to the search-param guards that read it.
export type CrownRange = '1h' | '2h' | '4h';
export type RateRange = '1h' | '4h' | '24h' | '4d';

const RANGES: readonly Range[] = ['24h', '7d', '30d', '90d', 'all'];
const CROWN_RANGES: readonly CrownRange[] = ['1h', '2h', '4h'];
const RATE_RANGES: readonly RateRange[] = ['1h', '4h', '24h', '4d'];

export const isRange = (v: string | null): v is Range =>
  RANGES.includes((v ?? '') as Range);

export const isDirection = (v: string | null): v is Direction =>
  v === 'BTC-TAO' || v === 'TAO-BTC';

export const isCrownRange = (v: string | null): v is CrownRange =>
  CROWN_RANGES.includes((v ?? '') as CrownRange);

export const isRateRange = (v: string | null): v is RateRange =>
  RATE_RANGES.includes((v ?? '') as RateRange);

export const parseBlockParam = (v: string | null): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
};
