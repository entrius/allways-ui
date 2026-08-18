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

// Reactive direction list — re-derives when das serves a changed chain set.
export const useDirections = (): Direction[] => {
  const { data } = useChains();
  return useMemo(() => allDirections(data), [data]);
};
