import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import type {
  ActiveSwap,
  CrownHistoryRow,
  CrownRateHistoryRow,
  CrownTimeWindow,
  CurrentCrownMap,
  CurrentMinerScoreRow,
  Direction,
  HaltState,
  LeaderboardRow,
  MinerRateHistoryRow,
  MinerScoreRow,
  MinerStats,
  NetworkOverview,
  Range,
  ScoringState,
} from './models';

const CROWN_REFRESH_MS = 12_000;

export const useCurrentCrown = () =>
  useApiQuery<CurrentCrownMap>('crown', '/crown', CROWN_REFRESH_MS);

// NOTE: das-allways reads fromTime/toTime/seconds — the query keys below must
// use those names (the JS param names stay short for callers).
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
      fromTime: params.fromTs,
      toTime: params.toTs,
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
      fromTime: params.fromTs,
      toTime: params.toTs,
      seconds: params.secs,
    },
  );

// Crown-time leaderboard for a direction: seconds each miner held the crown in
// the window (tie-credited) + share of the window.
export const useCrownTime = (params: {
  direction: Direction;
  seconds?: number;
  fromTs?: number;
  toTs?: number;
}) =>
  useApiQuery<CrownTimeWindow>('crown-time', '/crown/time', CROWN_REFRESH_MS, {
    direction: params.direction,
    seconds: params.seconds,
    fromTime: params.fromTs,
    toTime: params.toTs,
  });

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

// Validator-written score snapshots, one row per (round, direction) the miner
// held crown in. Defaults to the API's 30d window when no bounds are given.
export const useMinerScores = (
  hotkey: string,
  params: { direction?: Direction; fromTs?: number; toTs?: number } = {},
  enabled = true,
) =>
  useApiQuery<MinerScoreRow[]>(
    'miner-scores',
    `/miners/${hotkey}/scores`,
    SSE_FALLBACK_INTERVAL,
    {
      direction: params.direction,
      fromTime: params.fromTs,
      toTime: params.toTs,
    },
    !!hotkey && enabled,
  );

// Live mid-round tip — refreshed on the crown cadence so the "this round"
// readout tracks the still-scoring round, not just the last flushed one.
export const useCurrentMinerScores = (hotkey: string) =>
  useApiQuery<CurrentMinerScoreRow[]>(
    'miner-scores-current',
    `/miners/${hotkey}/scores/current`,
    CROWN_REFRESH_MS,
    undefined,
    !!hotkey,
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
    { fromTime: params.fromTs, toTime: params.toTs, seconds: params.secs },
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
