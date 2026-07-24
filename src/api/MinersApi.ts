import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import { type Miner } from './models';

// /miners is active-only by default: a deactivated miner's quote can't fill, and serving it as
// depth misleads takers sizing a swap. The dashboard wants the full roster — it renders miners
// with their status, and useMinerLabel below resolves UIDs for every hotkey the site mentions,
// including deactivated ones — so it opts back in.
export const useMiners = () =>
  useApiQuery<Miner[]>(
    'miners',
    '/miners?includeInactive=true',
    SSE_FALLBACK_INTERVAL,
  );

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
