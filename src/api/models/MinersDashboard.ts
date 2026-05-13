export type Direction = 'BTC-TAO' | 'TAO-BTC';
export type Range = '24h' | '7d' | '30d' | '90d' | 'all';

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
  isActive: boolean;
  currentCrownDirections: Direction[];
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
};

export type HaltState = { halted: boolean; asOfBlock: number };
