import { canonicalSource, directionalRate, rateUnit } from '../../utils/format';
import { hubChains } from './chains';

// Each hub↔spoke leg is its own crown/pool: the forward hub→spoke quotes plus
// their reverses. Directions are runtime strings ("SOL-BTC") derived from the
// das /chains data — validate with isDirection / allDirections, never a
// hand-typed union.
export type Direction = string;
export type Range = '1h' | '24h' | '7d' | '30d' | '90d' | 'all';

// 'SOL-BTC' → 'SOL → BTC'
export const directionLabel = (dir: Direction): string =>
  dir.replace('-', ' → ');

// Splits a direction into its lowercase legs, the spoke (non-anchor side —
// for a hub↔hub pair, the lower-priority hub), and whether it's the forward
// (anchor→spoke) or reverse leg — "which pair" vs "which way".
export const decomposeDirection = (
  dir: Direction,
): {
  from: string;
  to: string;
  spoke: string;
  leg: 'forward' | 'reverse';
} => {
  const [from, to] = dir.split('-').map((c) => c.toLowerCase());
  const forward = from === canonicalSource(from, to);
  return {
    from,
    to,
    spoke: forward ? to : from,
    leg: forward ? 'forward' : 'reverse',
  };
};

// Directional presentation of a canonical stored rate for `dir` — "to per 1
// from". Stored rates (quotes, swaps, crown, rate history) are ALWAYS
// canonical "spoke per 1 hub-anchor"; reverse legs invert here.
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

// The backing lanes a direction is scored on (F4), hub-leg first — mirror of
// das declarableBackings / allways declarable_backings. One entry for a spoke
// pair (its hub leg), two for the hub↔hub pair (sol↔tao → [sol, tao]).
export const lanesFor = (dir: Direction): string[] => {
  const { from, to } = decomposeDirection(dir);
  return hubChains().filter((h) => h === from || h === to);
};

// True only for a hub↔hub direction (sol↔tao) — the one pair with two crowns.
export const isTwoLane = (dir: Direction): boolean => lanesFor(dir).length > 1;

export type CrownLane = {
  direction: Direction;
  backing: string;
};

export type CurrentCrownHolder = {
  hotkey: string;
  uid: number | null;
  // Fraction of the direction's crown this member holds; a band sums to 1.0.
  credit: number;
};

export type CurrentCrown = {
  // The lane's funding purse (F4). sol↔tao returns one CurrentCrown per backing
  // (hub-leg first); every spoke direction returns exactly one, backing = its hub.
  backing: string;
  // Dominant (highest-credit) band holder. `rate` is always the band's anchor
  // (best) rate, so single-rate readers like the ticker stay correct.
  uid: number | null;
  hotkey: string | null;
  rate: number | null;
  // Unix seconds the current holder's streak began, or null when unknown.
  since?: number | null;
  // Every band member with its credit, dominant first. Absent on older APIs.
  holders?: CurrentCrownHolder[];
};

// Per direction, ONE lane per declarable backing (F4): spoke → 1 element,
// sol↔tao → 2, ordered [sol, tao]. Use crownLaneFor to pick a lane.
export type CurrentCrownMap = Record<Direction, CurrentCrown[]>;

// The lane for a direction: an explicit `backing`, else the hub-leg lane (index
// 0 — das orders lanes hub-leg first). Undefined when the direction is absent.
export const crownLaneFor = (
  map: CurrentCrownMap | undefined,
  dir: Direction,
  backing?: string,
): CurrentCrown | undefined => {
  const lanes = map?.[dir];
  if (!lanes || lanes.length === 0) return undefined;
  if (backing) return lanes.find((l) => l.backing === backing);
  return lanes[0];
};

// One lane's pool per scoring round over a window (das /crown/pools/history):
// the share of miner emission the lane paid out of at each round, 0 when its
// pair was dead (no qualified fill in the pool window). Hub and pair emission
// are sums of lanes at each t.
export type PoolHistoryPoint = {
  // Unix seconds, the round's flush time.
  t: number;
  pool: number;
  // Qualified hub-leg notional over the pool window, backing's smallest unit.
  qualifiedVolume: string;
  live: boolean;
};

export type PoolHistoryLane = {
  direction: Direction;
  from: string;
  to: string;
  backing: string;
  // The pair's hub anchor — the family this lane's emission sits under.
  hub: string;
  points: PoolHistoryPoint[];
};

export type PoolHistory = {
  from: number | null;
  to: number | null;
  lanes: PoolHistoryLane[];
};

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
  // Completed volume per backing, each in its own smallest unit (absent on
  // older das); never sum across keys.
  volumeByBacking?: Record<string, string>;
  collateral: string;
  isActive: boolean;
  currentCrownDirections: Direction[];
  // Lane-aware twin: one entry per (direction, backing) lane this miner
  // dominates. Absent on older das — fall back to currentCrownDirections.
  currentCrownLanes?: CrownLane[];
};

// One validator-written score snapshot per (round, direction) the miner held
// crown in. Rounds are ~hourly; the API returns them ordered roundTs ASC.
// reward = eligible × pool × crownShare × capacity.
export type MinerScoreRow = {
  roundTs: number;
  direction: Direction | null;
  fromChain: string;
  toChain: string;
  // The lane's funding purse (F4): a dual-purse miner has two sol↔tao rows per
  // round, one per backing. Absent on older das (one row, treat as the hub leg).
  backing?: string;
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
  // Completed volume per backing, each in its own smallest unit (absent on
  // older das); never sum across keys.
  volumeByBacking?: Record<string, string>;
  avgFulfillSec: number | null;
  avgCompleteSec: number | null;
  crownShare: number;
  isActive: boolean;
  collateral: string;
  // Unix seconds the miner activated, or null.
  activatedAt: number | null;
  currentCrownDirections: Direction[];
  currentCrownLanes?: CrownLane[];
};

export type MinerRateHistoryRow = {
  // Unix-seconds bucket timestamp.
  t: number;
  rate: number;
  fromChain: string;
  toChain: string;
  // The quote's collateral chain — two same-direction series (sol- and
  // tao-backed) move independently; group by it before charting.
  backing: string;
};

export type PairMix = { pair: string; pct: number };

export type NetworkOverview = {
  volumeSol: string;
  // Per-backing counterparts of the *Sol scalars (absent on older das):
  // each key in its own smallest unit — never sum across keys.
  volumeByBacking?: Record<string, string>;
  totalSwaps: number;
  networkSuccessRate: number;
  activeMiners: number;
  pairMix: PairMix[];
  scoringWindowVolumeSol: string;
  scoringWindowVolumeByBacking?: Record<string, string>;
  maxSwapAmount: string;
  // Per-hub swap-size bounds keyed by backing, each in that hub's own
  // smallest unit; "0" = unset. maxSwapAmount stays the legacy sol max.
  swapBounds?: Record<string, { min: string; max: string }>;
};

export type HaltState = { halted: boolean; asOf: number };

// Validator's last crown flush. lastScored is the unix-seconds watermark
// scored through; updatedAt is the wall-clock time of that flush (advances only
// on a real flush, ~every scoring window), or null before the first flush.
export type ScoringState = {
  lastScored: number;
  updatedAt: string | null;
};
