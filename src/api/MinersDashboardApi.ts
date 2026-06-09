import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import type {
  ActiveSwap,
  CrownHistoryRow,
  CrownRateHistoryRow,
  CurrentCrownMap,
  Direction,
  HaltState,
  LeaderboardRow,
  MinerRateHistoryRow,
  MinerStats,
  NetworkOverview,
  Range,
  ScoreFactors,
  ScoringState,
} from './models';

const CROWN_REFRESH_MS = 12_000;

export const useCurrentCrown = () =>
  useApiQuery<CurrentCrownMap>('crown', '/crown', CROWN_REFRESH_MS);

export const useCrownHistory = (params: {
  direction: Direction;
  fromBlock?: number;
  toBlock?: number;
}) =>
  useApiQuery<CrownHistoryRow[]>(
    'crown-history',
    '/crown/history',
    CROWN_REFRESH_MS,
    {
      direction: params.direction,
      fromBlock: params.fromBlock,
      toBlock: params.toBlock,
    },
  );

export const useCrownRateHistory = (
  params: {
    direction: Direction;
    fromBlock?: number;
    toBlock?: number;
    blocks?: number;
    // Opt in to the live current-crown tip stitched onto the end (the
    // informational dashboard). Omitted entirely when false so per-block
    // consumers (e.g. the miner rate chart) keep the clean settled ledger and
    // an unchanged query key. See das-allways /crown/rate-history `liveTip`.
    liveTip?: boolean;
  },
  enabled?: boolean,
) =>
  useApiQuery<CrownRateHistoryRow[]>(
    'crown-rate-history',
    '/crown/rate-history',
    CROWN_REFRESH_MS,
    {
      direction: params.direction,
      fromBlock: params.fromBlock,
      toBlock: params.toBlock,
      blocks: params.blocks,
      liveTip: params.liveTip ? 'true' : undefined,
    },
    enabled,
  );

export const useMinerLeaderboard = (range: Range = '30d') =>
  useApiQuery<LeaderboardRow[]>(
    'miners-leaderboard',
    '/miners/leaderboard',
    SSE_FALLBACK_INTERVAL,
    {
      range,
    },
  );

export const useMinerStats = (hotkey: string, range: Range = '30d') =>
  useApiQuery<MinerStats>(
    'miner-stats',
    `/miners/${hotkey}/stats`,
    SSE_FALLBACK_INTERVAL,
    { range },
    !!hotkey,
  );

export const useScoreFactorsWindow = (
  hotkey: string,
  direction: Direction,
  fromBlock: number | undefined,
  toBlock: number | undefined,
) =>
  useApiQuery<ScoreFactors>(
    'miner-score-factors-window',
    `/miners/${hotkey}/score-factors`,
    SSE_FALLBACK_INTERVAL,
    { direction, fromBlock, toBlock },
    !!hotkey && fromBlock != null && toBlock != null && toBlock >= fromBlock,
  );

export const useMinerSwaps = (
  hotkey: string,
  params: { limit?: number; offset?: number; status?: string } = {},
) =>
  useApiQuery<{ rows: ActiveSwap[]; totalCount: number }>(
    'miner-swaps',
    `/miners/${hotkey}/swaps`,
    SSE_FALLBACK_INTERVAL,
    params,
    !!hotkey,
  );

export const useMinerRateHistory = (
  hotkey: string,
  params: { fromBlock?: number; toBlock?: number; blocks?: number } = {},
) =>
  useApiQuery<MinerRateHistoryRow[]>(
    'miner-rate-history',
    `/miners/${hotkey}/rate-history`,
    SSE_FALLBACK_INTERVAL,
    params,
    !!hotkey,
  );

export const useNetworkOverview = (range: Range = '30d') =>
  useApiQuery<NetworkOverview>(
    'network-overview',
    '/network/overview',
    SSE_FALLBACK_INTERVAL,
    {
      range,
    },
  );

export const useHaltState = () =>
  useApiQuery<HaltState>(
    'network-halt-state',
    '/network/halt-state',
    CROWN_REFRESH_MS,
  );

export const useScoringState = () =>
  useApiQuery<ScoringState>(
    'network-scoring-state',
    '/network/scoring-state',
    CROWN_REFRESH_MS,
  );
