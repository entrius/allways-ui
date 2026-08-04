import { directionalRate, rateUnit } from '../../utils/format';

// Each hub↔spoke leg is its own crown/pool: the forward SOL→spoke quotes plus
// their SOL-hub reverses. Mirrors das-allways' Direction / allways.constants.
export type Direction =
  | 'SOL-BTC'
  | 'BTC-SOL'
  | 'SOL-TAO'
  | 'TAO-SOL'
  | 'SOL-ETH'
  | 'ETH-SOL';
export type Range = '1h' | '24h' | '7d' | '30d' | '90d' | 'all';

// Canonical render order — pairs kept together, forward leg first.
export const ALL_DIRECTIONS: Direction[] = [
  'SOL-BTC',
  'BTC-SOL',
  'SOL-TAO',
  'TAO-SOL',
  'SOL-ETH',
  'ETH-SOL',
];

// 'SOL-BTC' → 'SOL → BTC'
export const directionLabel = (dir: Direction): string =>
  dir.replace('-', ' → ');

// Splits a direction into its lowercase chain legs, the spoke chain (the
// non-hub side), and whether it's the forward (SOL→spoke) or reverse
// (spoke→SOL) leg. This separates "which pair" (spoke) from "which way" (leg)
// so callers stop conflating the two.
export const decomposeDirection = (
  dir: Direction,
): {
  from: string;
  to: string;
  spoke: string;
  leg: 'forward' | 'reverse';
} => {
  const [from, to] = dir.split('-').map((c) => c.toLowerCase());
  const forward = from === 'sol';
  return {
    from,
    to,
    spoke: forward ? to : from,
    leg: forward ? 'forward' : 'reverse',
  };
};

// Directional presentation of a canonical stored rate for `dir` — "to per 1
// from", what the user receives per 1 sent. Stored rates (quotes, swaps,
// crown, rate history) are ALWAYS canonical "spoke per 1 SOL"; reverse legs
// invert here, at the presentation boundary.
export const directionalRateFor = (
  dir: Direction,
  rate: string | number | null | undefined,
): number | null => {
  const { from, to } = decomposeDirection(dir);
  return directionalRate(from, to, rate);
};

// "BTC/SOL" — compact unit for directionalRateFor's output (to per 1 from).
export const rateUnitFor = (dir: Direction): string => {
  const { from, to } = decomposeDirection(dir);
  return rateUnit(from, to);
};

// "BTC per 1 SOL" — explicit phrasing of the same unit for headers and labels
// where the compact slash form reads ambiguously (which side is the 1?).
export const rateUnitVerboseFor = (dir: Direction): string => {
  const { from, to } = decomposeDirection(dir);
  return `${to.toUpperCase()} per 1 ${from.toUpperCase()}`;
};

export type CurrentCrownHolder = {
  hotkey: string;
  uid: number | null;
  // Fraction of the direction's crown this member holds; a band sums to 1.0.
  credit: number;
};

export type CurrentCrown = {
  // Dominant (highest-credit) band holder. `rate` is always the band's anchor
  // (best) rate, so single-rate readers like the ticker stay correct.
  uid: number | null;
  hotkey: string | null;
  rate: number | null;
  // Every band member with its credit, dominant first. Absent on older APIs.
  holders?: CurrentCrownHolder[];
};

export type CurrentCrownMap = Record<Direction, CurrentCrown>;

export type CrownHistoryRow = {
  // Interval start (unix seconds) the holder took the crown.
  t: number;
  // Interval end (unix seconds, exclusive).
  endedAt: number;
  hotkey: string;
  uid: number | null;
  rate: number;
  // Holder's fraction of this interval's crown. Absent on older APIs — readers
  // treat missing as an even split among the interval's rows.
  credit?: number;
};

// One miner's crown time within a window: seconds held (tie-credited) and that
// as a fraction of the window's duration. Feeds the crown-time leaderboard.
export type CrownTimeRow = {
  hotkey: string;
  uid: number | null;
  crownSecs: number;
  shareOfWindow: number;
  rate: number;
};

export type CrownTimeWindow = {
  windowStart: number;
  windowEnd: number;
  windowSecs: number;
  holders: CrownTimeRow[];
};

export type CrownRateHistoryRow = {
  t: number;
  rate: number;
};

export type LeaderboardRow = {
  uid: number | null;
  hotkey: string;
  crownShare: number;
  successRate: number;
  completedSwaps: number;
  timedOutSwaps: number;
  volumeSol: string;
  collateral: string;
  isActive: boolean;
  currentCrownDirections: Direction[];
};

// One validator-written score snapshot per (round, direction) the miner held
// crown in. Rounds are ~hourly; the API returns them ordered roundTs ASC.
// reward = eligible × pool × crownShare × capacity.
export type MinerScoreRow = {
  roundTs: number;
  direction: Direction | null;
  fromChain: string;
  toChain: string;
  eligible: boolean;
  // The direction's emission pool for the round — volume-weighted, so it varies
  // per round and per direction. Null on rounds the validator scored before it
  // recorded the pool.
  pool: number | null;
  crownShare: number;
  capacity: number;
  reward: number;
};

// The live mid-round tip — same factors keyed by `ts` instead of `roundTs`.
// Empty array when the miner holds no crown right now.
export type CurrentMinerScoreRow = Omit<MinerScoreRow, 'roundTs'> & {
  ts: number;
};

export type MinerStats = {
  uid: number | null;
  totalSwaps: number;
  completedSwaps: number;
  timedOutSwaps: number;
  successRate: number;
  volumeSol: string;
  avgFulfillSec: number | null;
  avgCompleteSec: number | null;
  crownShare: number;
  isActive: boolean;
  collateral: string;
  // Unix seconds the miner activated, or null.
  activatedAt: number | null;
  currentCrownDirections: Direction[];
};

export type MinerRateHistoryRow = {
  // Unix-seconds bucket timestamp.
  t: number;
  rate: number;
  fromChain: string;
  toChain: string;
};

export type PairMix = { pair: string; pct: number };

export type NetworkOverview = {
  volumeSol: string;
  totalSwaps: number;
  networkSuccessRate: number;
  activeMiners: number;
  pairMix: PairMix[];
  scoringWindowVolumeSol: string;
  maxSwapAmount: string;
};

export type HaltState = { halted: boolean; asOf: number };

// Validator's last crown flush. lastScored is the unix-seconds watermark
// scored through; updatedAt is the wall-clock time of that flush (advances only
// on a real flush, ~every scoring window), or null before the first flush.
export type ScoringState = {
  lastScored: number;
  updatedAt: string | null;
};
