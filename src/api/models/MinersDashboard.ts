export type Direction = 'BTC-TAO' | 'TAO-BTC';
export type Range = '1h' | '24h' | '7d' | '30d' | '90d' | 'all';

export type CurrentCrown = {
  uid: number | null;
  hotkey: string | null;
  rate: number | null;
  // Unix seconds the current holder took the crown.
  sinceTs: number | null;
};

export type CurrentCrownMap = Record<Direction, CurrentCrown>;

export type CrownHistoryRow = {
  // Unix-seconds bucket timestamp for this crown observation.
  t: number;
  hotkey: string;
  uid: number | null;
  rate: number;
};

export type CrownRateHistoryRow = {
  t: number;
  rate: number;
};

export type LeaderboardRow = {
  uid: number;
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

export type ScoreFactors = {
  capacityFactor: number;
  collateral: string;
  maxSwapAmount: string;

  volumeFactor: number;
  volumeShareWindow: number;
  crownShareWindow: number;
  volumeSolWindow: string;
  networkVolumeSolWindow: string;
  previousCrownShareWindow: number;
  previousVolumeFactor: number;

  closedSwaps: number;
  credibilityRamp: number;
  credibilityRampTarget: number;
  // Timed-out swaps in the credibility window — used to explain a hard-zeroed ramp.
  credibilityTimedOut: number;
  successRate30d: number;
  successMultiplier: number;
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
  scoreFactors: ScoreFactors;
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

// Validator's last crown/rate flush. lastScoredAt is the unix-seconds watermark
// scored through; updatedAt is the wall-clock time of that flush (advances only
// on a real flush, ~every scoring window), or null before the first flush.
export type ScoringState = {
  lastScoredAt: number;
  updatedAt: string | null;
};
