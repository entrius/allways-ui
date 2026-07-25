import type { ActiveSwap } from '../../api/models';

// The transactions explorer's find filters. The URL query string is the
// single source of truth: SwapTracker writes it, SwapTracker AND
// TransactionsPulse read it, so the chart and the tape always show the same
// filtered dataset — and any filtered view is shareable / bookmarkable.

export type StatusFilter = 'all' | 'completed' | 'timed_out' | 'in_flight';

export type TxFilters = {
  fromChain: string; // 'all' or a chain
  toChain: string; // 'all' or a chain
  status: StatusFilter;
  dateFrom: string; // yyyy-mm-dd or ''
  dateTo: string;
  minSol: string; // decimal SOL or ''
  maxSol: string;
};

export const EMPTY_FILTERS: TxFilters = {
  fromChain: 'all',
  toChain: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
  minSol: '',
  maxSol: '',
};

// filter key → query param name (short, readable URLs).
const PARAM_OF: Record<keyof TxFilters, string> = {
  fromChain: 'from',
  toChain: 'to',
  status: 'status',
  dateFrom: 'dfrom',
  dateTo: 'dto',
  minSol: 'min',
  maxSol: 'max',
};

const STATUSES: StatusFilter[] = ['all', 'completed', 'timed_out', 'in_flight'];

export const filtersFromParams = (params: URLSearchParams): TxFilters => {
  const status = params.get(PARAM_OF.status) as StatusFilter | null;
  return {
    fromChain: params.get(PARAM_OF.fromChain)?.toLowerCase() ?? 'all',
    toChain: params.get(PARAM_OF.toChain)?.toLowerCase() ?? 'all',
    status: status && STATUSES.includes(status) ? status : 'all',
    dateFrom: params.get(PARAM_OF.dateFrom) ?? '',
    dateTo: params.get(PARAM_OF.dateTo) ?? '',
    minSol: params.get(PARAM_OF.minSol) ?? '',
    maxSol: params.get(PARAM_OF.maxSol) ?? '',
  };
};

/** Write `next` into a copy of `base`, dropping params at their defaults so
 * a clean state keeps a clean URL. */
export const filtersToParams = (
  next: TxFilters,
  base: URLSearchParams,
): URLSearchParams => {
  const out = new URLSearchParams(base);
  for (const key of Object.keys(PARAM_OF) as (keyof TxFilters)[]) {
    if (next[key] === EMPTY_FILTERS[key]) out.delete(PARAM_OF[key]);
    else out.set(PARAM_OF[key], next[key]);
  }
  return out;
};

export const countActiveFilters = (f: TxFilters): number =>
  Object.entries(f).filter(
    ([k, v]) => v !== EMPTY_FILTERS[k as keyof TxFilters],
  ).length;

export const toNum = (v: string | null): number => {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : 0;
};

// Size ranks/filters on the SOL leg (the network numeraire), so amounts stay
// comparable across pairs.
export const solNotional = (s: ActiveSwap): number =>
  toNum(
    s.sourceChain?.toLowerCase() === 'sol'
      ? s.sourceAmount
      : (s.destAmount ?? s.solAmount),
  );

export const isTerminal = (s: ActiveSwap): boolean =>
  s.status === 'COMPLETED' || s.status === 'TIMED_OUT';

export const applyTxFilters = (
  rows: ActiveSwap[],
  f: TxFilters,
): ActiveSwap[] => {
  // Date bounds are local-day inclusive.
  const from = f.dateFrom ? Date.parse(`${f.dateFrom}T00:00:00`) / 1000 : null;
  const to = f.dateTo ? Date.parse(`${f.dateTo}T23:59:59`) / 1000 : null;
  const minSol = f.minSol ? parseFloat(f.minSol) : null;
  const maxSol = f.maxSol ? parseFloat(f.maxSol) : null;
  return rows.filter((s) => {
    if (f.fromChain !== 'all' && s.sourceChain?.toLowerCase() !== f.fromChain)
      return false;
    if (f.toChain !== 'all' && s.destChain?.toLowerCase() !== f.toChain)
      return false;
    if (f.status === 'completed' && s.status !== 'COMPLETED') return false;
    if (f.status === 'timed_out' && s.status !== 'TIMED_OUT') return false;
    if (f.status === 'in_flight' && isTerminal(s)) return false;
    const t = toNum(s.initiatedAt);
    if (from != null && (!t || t < from)) return false;
    if (to != null && (!t || t > to)) return false;
    const sol = solNotional(s) / 1e9;
    if (minSol != null && Number.isFinite(minSol) && sol < minSol) return false;
    if (maxSol != null && Number.isFinite(maxSol) && sol > maxSol) return false;
    return true;
  });
};
