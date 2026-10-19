import axios from 'axios';
import { useQueries, useQuery } from '@tanstack/react-query';
import { UTC_DAY_MS, type TreasuryDay } from '../utils/dailyEconomics';

// GET /treasury — treasury income by source from das's event ledger, over an
// optional inclusive block_time window (unix seconds). All amounts lamports.
// The reservation figure is derived: reservation events x the *current*
// config reservation fee, since no event carries the fee paid.
export interface TreasurySummary {
  reservationFeeLamports: number;
  sources: {
    reservationFee: { lamports: number; events: number; derived: true };
    quoteChurnFee: { lamports: number; feeEvents: number };
    swapProtocolFee: { lamports: number; events: number };
  };
  grossLamports: number;
  firstBlockTime: number | null;
  lastBlockTime: number | null;
}

const TREASURY_REFETCH_MS = 5 * 60 * 1000;

// das holds 299 corrupt QuoteSet churn fees in this block_time window
// (Aug 19-20 2026, ~9.1e18 lamports in total; the real maximum is 0.01 SOL
// per update). Every churn fee inside it is excluded until das drops them.
export const CORRUPT_CHURN_WINDOW = [1787173319, 1787199604] as const;

/** All-time treasury income by source, minus the corrupt churn window. */
export const useTreasury = () =>
  useQuery({
    queryKey: ['treasury', 'all-time'],
    queryFn: async (): Promise<TreasurySummary> => {
      const [all, corrupt] = await Promise.all([
        fetchTreasury(0, 2147483647),
        fetchTreasury(...CORRUPT_CHURN_WINDOW),
      ]);
      const churn = all.sources.quoteChurnFee;
      const bad = corrupt.sources.quoteChurnFee;
      return {
        ...all,
        sources: {
          ...all.sources,
          quoteChurnFee: {
            lamports: Math.max(
              0,
              Number(churn.lamports) - Number(bad.lamports),
            ),
            feeEvents: churn.feeEvents - bad.feeEvents,
          },
        },
      };
    },
    refetchInterval: TREASURY_REFETCH_MS,
  });

/** Treasury income inside one window, `timeTo` inclusive. */
export async function fetchTreasury(
  timeFrom: number,
  timeTo: number,
): Promise<TreasurySummary> {
  const base = import.meta.env.VITE_REACT_APP_BASE_URL ?? '';
  const response = await axios.get<TreasurySummary>(`${base}/treasury`, {
    params: { timeFrom, timeTo },
  });
  if (!String(response.headers['content-type']).includes('json')) {
    throw new Error('Treasury income is unavailable');
  }
  return response.data;
}

/** [epoch ms, USD] SOL samples, one at each UTC midnight plus the latest. */
export async function fetchSolUsdHistory(
  days: number,
): Promise<[number, number][]> {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=${days}&interval=daily`,
  );
  if (!response.ok) throw new Error(`coingecko -> ${response.status}`);
  const data = (await response.json()) as { prices?: [number, number][] };
  return data.prices ?? [];
}

/** Reservation and quote-churn income for one UTC day starting at `t` (ms).
 * Churn inside the corrupt window is subtracted; a failed call is a gap,
 * never zero. */
async function loadTreasuryDay(t: number): Promise<TreasuryDay> {
  const from = t / 1000;
  const to = (t + UTC_DAY_MS) / 1000 - 1;
  const [badFrom, badTo] = CORRUPT_CHURN_WINDOW;
  try {
    const overlaps = from <= badTo && to >= badFrom;
    const [day, bad] = await Promise.all([
      fetchTreasury(from, to),
      overlaps
        ? fetchTreasury(Math.max(from, badFrom), Math.min(to, badTo))
        : null,
    ]);
    const churn = day.sources.quoteChurnFee;
    const badChurn = bad?.sources.quoteChurnFee;
    return {
      t,
      reservationLamports: Number(day.sources.reservationFee.lamports),
      reservationEvents: day.sources.reservationFee.events,
      churnLamports: Math.max(
        0,
        Number(churn.lamports) - Number(badChurn?.lamports ?? 0),
      ),
      churnEvents: churn.feeEvents - (badChurn?.feeEvents ?? 0),
    };
  } catch {
    return {
      t,
      reservationLamports: null,
      reservationEvents: null,
      churnLamports: null,
      churnEvents: null,
    };
  }
}

// Module-level so useQueries keeps the combined result stable between renders.
const combineDays = (
  results: { data?: TreasuryDay; isLoading: boolean }[],
) => ({
  days: results.flatMap((r) => (r.data ? [r.data] : [])),
  isLoading: results.some((r) => r.isLoading),
});

/**
 * Treasury income for the `days` complete UTC days before `todayStart`, plus
 * today, with SOL/USD samples to value it. One cached query per day, so the
 * 7d, 30d and all-time views share what they have already loaded: completed
 * days never refetch, today refreshes every five minutes.
 */
export function useDailyTreasury(days: number, todayStart: number) {
  const starts = Array.from(
    { length: days + 1 },
    (_, i) => todayStart - (days - i) * UTC_DAY_MS,
  );
  const income = useQueries({
    combine: combineDays,
    queries: starts.map((t) => ({
      queryKey: ['treasury-day', t],
      queryFn: () => loadTreasuryDay(t),
      ...(t === todayStart
        ? { refetchInterval: TREASURY_REFETCH_MS }
        : { staleTime: Infinity }),
    })),
  });
  const solUsd = useQuery({
    queryKey: ['sol-usd-daily', days],
    queryFn: () => fetchSolUsdHistory(days + 1),
    staleTime: 3_600_000,
    retry: 1,
  });
  return {
    treasury: income.days,
    solUsd: solUsd.data,
    isLoading: income.isLoading || solUsd.isLoading,
    solUsdError: solUsd.isError,
  };
}
