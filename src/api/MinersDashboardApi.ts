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

export const useCrownRateHistory = (params: {
  direction: Direction;
  fromBlock?: number;
  toBlock?: number;
  blocks?: number;
}) =>
  useApiQuery<CrownRateHistoryRow[]>(
    'crown-rate-history',
    '/crown/rate-history',
    CROWN_REFRESH_MS,
    {
      direction: params.direction,
      fromBlock: params.fromBlock,
      toBlock: params.toBlock,
      blocks: params.blocks,
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
