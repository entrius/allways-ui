import type { ActiveSwap } from '../../api/models';

// The transactions explorer's find filters. The URL query string is the
// single source of truth: SwapTracker writes it and reads it back, so any
// filtered view is shareable / bookmarkable. das applies the filters
// themselves (GET /swaps), so these are the wire format, not a predicate.

// Rows per page on the explorer's tape. Lives here so the nav prefetch can
// warm the exact query the tape will ask for.
export const DEFAULT_PAGE_SIZE = 10;

export type StatusFilter =
  | 'all'
  | 'completed'
  | 'timed_out'
  | 'cancelled'
  | 'in_flight';

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

const STATUSES: StatusFilter[] = [
  'all',
  'completed',
  'timed_out',
  'cancelled',
  'in_flight',
];

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

export const isTerminal = (s: ActiveSwap): boolean =>
  s.status === 'COMPLETED' ||
  s.status === 'TIMED_OUT' ||
  s.status === 'CANCELLED' ||
  // A claim reaped before initiate quorum — never opened, nothing in flight.
  s.status === 'EXPIRED';
