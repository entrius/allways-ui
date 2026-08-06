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

const CHAINS_REFRESH_MS = 300_000;

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
    retry: false,
  });

// Reactive direction list — re-derives when das serves a changed chain set.
export const useDirections = (): Direction[] => {
  const { data } = useChains();
  return useMemo(() => allDirections(data), [data]);
};
