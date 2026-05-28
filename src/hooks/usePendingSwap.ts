import { useCallback, useEffect, useState } from 'react';

/**
 * Mirror of the CLI's `pending_swap.json`. Spec §4c: per-user disambiguation
 * is keyed on (fromAddress, miner, blockAnchor) — two parallel swaps must not
 * clobber each other in localStorage.
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
  /** ISO timestamp of last write — used as recency tiebreaker for `pending`. */
  updatedAt: string;
}

const STORAGE_KEY = 'allways.pendingSwaps';

const swapKey = (
  s: Pick<PendingSwap, 'fromAddress' | 'minerHotkey' | 'blockAnchor'>,
): string => `${s.fromAddress}|${s.minerHotkey}|${s.blockAnchor}`;

const readAll = (): Record<string, PendingSwap> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, PendingSwap>)
      : {};
  } catch {
    return {};
  }
};

const writeAll = (value: Record<string, PendingSwap>): void => {
  if (typeof window === 'undefined') return;
  try {
    if (Object.keys(value).length === 0)
      window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* quota / private-mode — silently ignore */
  }
};

const mostRecent = (
  entries: Record<string, PendingSwap>,
): PendingSwap | null => {
  const list = Object.values(entries);
  if (list.length === 0) return null;
  return list.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
};

export const usePendingSwap = () => {
  const [pending, setPending] = useState<PendingSwap | null>(() =>
    mostRecent(readAll()),
  );

  // Keep tabs roughly in sync. Full BroadcastChannel ownership arbitration is
  // a v2 nice-to-have (spec §9 "Multi-tab races").
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setPending(mostRecent(readAll()));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const save = useCallback((value: Omit<PendingSwap, 'updatedAt'>) => {
    const next: PendingSwap = { ...value, updatedAt: new Date().toISOString() };
    const all = readAll();
    all[swapKey(next)] = next;
    writeAll(all);
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
      const all = readAll();
      all[swapKey(next)] = next;
      writeAll(all);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setPending((prev) => {
      if (!prev) {
        writeAll({});
        return null;
      }
      const all = readAll();
      delete all[swapKey(prev)];
      writeAll(all);
      return mostRecent(all);
    });
  }, []);

  return { pending, save, merge, clear };
};
