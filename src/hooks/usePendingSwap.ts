import { useCallback, useEffect, useState } from 'react';

/**
 * Mirror of the CLI's `pending_swap.json` — keyed on
 * (fromAddress, miner, blockAnchor) so per-user disambiguation works (spec §4c).
 */
export interface PendingSwap {
  /** Set when the user submitted the reserve mutation. */
  requestHash?: string;
  minerHotkey: string;
  minerSourceAddress?: string;
  fromAddress: string;
  toAddress: string;
  fromChain: string;
  toChain: string;
  fromAmount: number;
  toAmount: number;
  taoAmount: number;
  expectedRate: string;
  blockAnchor: number;
  /** Cached reserve proof signature so a reload can re-submit without re-prompting. */
  reserveSignature?: string;
  /** Source-side tx hash, once funds have been sent. */
  sourceTxHash?: string;
  /** Reservation expiry. Used by the resume flow to decide stale vs ACTIVE. */
  reservedUntilBlock?: number;
  /** Final on-chain swap id after confirm. */
  swapId?: number;
  /** ISO timestamp of last write. */
  updatedAt: string;
}

const STORAGE_KEY = 'allways.pendingSwap';

const readStorage = (): PendingSwap | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingSwap;
  } catch {
    return null;
  }
};

const writeStorage = (value: PendingSwap | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* quota / private-mode — silently ignore */
  }
};

export const usePendingSwap = () => {
  const [pending, setPending] = useState<PendingSwap | null>(() =>
    readStorage(),
  );

  // Keep tabs roughly in sync — re-read on `storage` events. Full
  // BroadcastChannel ownership arbitration is a v2 nice-to-have (spec §9
  // "Multi-tab races").
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setPending(readStorage());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const save = useCallback((value: Omit<PendingSwap, 'updatedAt'>) => {
    const next: PendingSwap = { ...value, updatedAt: new Date().toISOString() };
    writeStorage(next);
    setPending(next);
  }, []);

  const merge = useCallback((patch: Partial<PendingSwap>) => {
    setPending((prev) => {
      if (!prev) return prev;
      const next: PendingSwap = {
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeStorage(null);
    setPending(null);
  }, []);

  return { pending, save, merge, clear };
};
