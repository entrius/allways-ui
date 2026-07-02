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
  fromTs?: number;
  toTs?: number;
}) =>
  useApiQuery<CrownHistoryRow[]>(
    'crown-history',
    '/crown/history',
    CROWN_REFRESH_MS,
    {
      direction: params.direction,
      fromTs: params.fromTs,
      toTs: params.toTs,
    },
  );

export const useCrownRateHistory = (params: {
  direction: Direction;
  fromTs?: number;
  toTs?: number;
  secs?: number;
}) =>
  useApiQuery<CrownRateHistoryRow[]>(
    'crown-rate-history',
    '/crown/rate-history',
    CROWN_REFRESH_MS,
    {
      direction: params.direction,
      fromTs: params.fromTs,
      toTs: params.toTs,
      secs: params.secs,
    },
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
  fromTs: number | undefined,
  toTs: number | undefined,
) =>
  useApiQuery<ScoreFactors>(
    'miner-score-factors-window',
    `/miners/${hotkey}/score-factors`,
    SSE_FALLBACK_INTERVAL,
    { direction, fromTs, toTs },
    !!hotkey && fromTs != null && toTs != null && toTs >= fromTs,
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
  params: { fromTs?: number; toTs?: number; secs?: number } = {},
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
