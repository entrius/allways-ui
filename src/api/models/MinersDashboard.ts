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
  credit: number;
};

export type CrownRateHistoryRow = {
  block: number;
  rate: number;
  holderHotkey: string;
  holderUid: number | null;
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
  successRate: number;
  totalSwaps: number;
  completedSwaps: number;
  timedOutSwaps: number;
  volumeTao: string;
  avgFulfillSec: number | null;
  avgCompleteSec: number | null;
  crownShare: number;
  isActive: boolean;
  collateralRao: string;
  activatedAt: number | null;
};

export type DiagnosticAction = {
  kind: 'cli-command' | 'link';
  label: string;
  value: string;
};

export type DiagnosticRow = {
  severity: 'fail' | 'warn' | 'ok';
  code: string;
  headline: string;
  detail: string;
  action?: DiagnosticAction;
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
  registeredMiners: number;
  pairMix: PairMix[];
};

export type HaltState = { halted: boolean; asOfBlock: number };
