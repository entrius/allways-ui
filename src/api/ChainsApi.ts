import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  allDirections,
  chainList,
  setChains,
  type ChainInfo,
} from './models/chains';
import type { Direction } from './models';
import { useCurrentCrown } from './MinersDashboardApi';

const CHAINS_REFRESH_MS = 3_600_000;

// Live chain metadata from das, seeded from the committed snapshot so a das
// outage still renders the known chains. The fetch also updates the module
// registry that the pure helpers (formatting, directions) read.
export const useChains = () =>
  useQuery<ChainInfo[]>({
    queryKey: ['chains', '/chains'],
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
      const url = baseUrl ? `${baseUrl}/chains` : '/chains';
      const { data } = await axios.get<{ chains: ChainInfo[] }>(url);
      setChains(data.chains);
      return data.chains;
    },
    initialData: chainList,
    initialDataUpdatedAt: 0,
    staleTime: CHAINS_REFRESH_MS,
    refetchInterval: CHAINS_REFRESH_MS,
    // The app-wide default is refetchOnMount: false, which — paired with
    // initialData — would pin the registry to the committed seed until the
    // hourly interval first fired, so a chain added to das would not appear
    // for an hour and a stale seed would look like a missing market. The
    // seed is the OUTAGE fallback, not the source of truth: always confirm
    // it against das on mount.
    refetchOnMount: 'always',
    retry: false,
  });

// Every valid direction, live or not — for validation and ordering.
export const useDirections = (): Direction[] => {
  const { data } = useChains();
  return useMemo(() => allDirections(data), [data]);
};

// What menus and lists show: the directions with a live quote (a crown holder
// on any lane), in registry order, plus `pinned` ones (selected, deep-linked,
// starred, or held in history) so they never vanish.
export const useLiveDirections = (
  pinned: (Direction | null)[] = [],
): Direction[] => {
  const all = useDirections();
  const { data: crown } = useCurrentCrown();
  const live = useMemo(
    () => all.filter((d) => crown?.[d]?.some((lane) => lane.rate != null)),
    [all, crown],
  );
  // Keyed by content: callers pass fresh array literals.
  const missing = [...new Set(pinned)]
    .filter((d): d is Direction => !!d && !live.includes(d))
    .join(' ');
  return useMemo(
    () => (missing ? [...missing.split(' '), ...live] : live),
    [live, missing],
  );
};
