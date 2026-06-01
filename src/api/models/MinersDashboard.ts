export type Direction = 'BTC-TAO' | 'TAO-BTC';
export type Range = '1h' | '24h' | '7d' | '30d' | '90d' | 'all';

export type CurrentCrown = {
  uid: number | null;
  hotkey: string | null;
  rate: number | null;
  sinceBlock: number | null;
};

export type CurrentCrownMap = Record<Direction, CurrentCrown>;

export type CrownHistoryRow = {
  block: number;
  hotkey: string;
  uid: number | null;
  rate: number;
};

export type CrownRateHistoryRow = {
  block: number;
  rate: number;
};

export type LeaderboardRow = {
  uid: number;
  hotkey: string;
  crownShare: number;
  successRate: number;
  completedSwaps: number;
  timedOutSwaps: number;
  volumeTao: string;
  collateralRao: string;
  isActive: boolean;
  currentCrownDirections: Direction[];
};

export type ScoreFactors = {
  capacityFactor: number;
  collateralRao: string;
  maxSwapAmountRao: string;

  volumeFactor: number;
  volumeShareWindow: number;
  crownShareWindow: number;
  volumeTaoWindow: string;
  networkVolumeTaoWindow: string;
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
  volumeTao: string;
  avgFulfillSec: number | null;
  avgCompleteSec: number | null;
  crownShare: number;
  isActive: boolean;
  collateralRao: string;
  activatedAt: number | null;
  currentCrownDirections: Direction[];
  scoreFactors: ScoreFactors;
};

export type MinerRateHistoryRow = {
  block: number;
  rate: number;
  fromChain: string;
  toChain: string;
};

export type PairMix = { pair: string; pct: number };

export type NetworkOverview = {
  volumeTao: string;
  totalSwaps: number;
  networkSuccessRate: number;
  activeMiners: number;
  pairMix: PairMix[];
  scoringWindowVolumeTao: string;
  maxSwapAmountRao: string;
};

export type HaltState = { halted: boolean; asOfBlock: number };

// Validator's last crown/rate flush. lastScoredBlock is the block scored
// through; updatedAt is the wall-clock time of that flush (advances only on a
// real flush, ~every scoring window), or null before the first flush.
export type ScoringState = {
  lastScoredBlock: number;
  updatedAt: string | null;
};
