import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type Miner } from './models';

export const useMiners = () =>
  useApiQuery<Miner[]>('miners', '/miners', SSE_FALLBACK_INTERVAL);

// One identity convention across the dashboard: miners render as "UID n",
// falling back to a short hotkey only when the metagraph lookup misses.
export const useMinerLabel = () => {
  const { data: miners } = useMiners();
  return (hotkey: string | null | undefined): string | null => {
    if (!hotkey) return null;
    const uid = miners?.find((m) => m.hotkey === hotkey)?.uid;
    return uid != null ? `UID ${uid}` : `${hotkey.slice(0, 6)}…`;
  };
};

export const useMinerByHotkey = (hotkey: string) =>
  useApiQuery<Miner>(
    'miner',
    `/miners/${hotkey}`,
    SSE_FALLBACK_INTERVAL,
    undefined,
    !!hotkey,
  );
