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

// Every valid direction (~2k with the alpha↔spoke pairs) — re-derives when
// das serves a changed chain set. For validation and ordering; menus and
// lists show useLiveDirections.
export const useDirections = (): Direction[] => {
  const { data } = useChains();
  return useMemo(() => allDirections(data), [data]);
};

// The directions with a live quote (a crown holder on any lane), in registry
// order — what every menu and list shows. `pinned` (the selected or
// deep-linked direction) stays listed without a quote, so its chip never
// blanks. Empty until /crown lands.
export const useLiveDirections = (pinned?: Direction | null): Direction[] => {
  const all = useDirections();
  const { data: crown } = useCurrentCrown();
  return useMemo(() => {
    const live = all.filter((d) =>
      crown?.[d]?.some((lane) => lane.rate != null),
    );
    return pinned && !live.includes(pinned) ? [pinned, ...live] : live;
  }, [all, crown, pinned]);
};
