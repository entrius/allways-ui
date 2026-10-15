import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

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
