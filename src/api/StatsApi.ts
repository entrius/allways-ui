import { useApiQuery } from './ApiUtils';
import { SSE_FALLBACK_INTERVAL } from './constants';
import {
  type DashboardStats,
  type HistoryRow,
  type HistoryStateRow,
  type Range,
} from './models';

export const useStats = () =>
  useApiQuery<DashboardStats>('stats', '/stats', SSE_FALLBACK_INTERVAL);

/** Range covered by the strip's history charts. */
export type HistoryRange = Range;

/**
 * Bucket size paired with each range so the series has a sensible number of
 * points (dense enough to read as a curve, not so dense it's noisy).
 */
const INTERVAL_FOR_RANGE: Record<HistoryRange, string> = {
  '1h': 'minute',
  '24h': 'hour',
  '7d': 'hour',
  '30d': 'day',
  '90d': 'day',
  all: 'week',
};

/** `GET /history` — gap-filled time series, newest-last. */
export const useHistory = (range: HistoryRange, interval?: string) =>
  useApiQuery<HistoryRow[]>('history', '/history', SSE_FALLBACK_INTERVAL, {
    range,
    interval: interval ?? INTERVAL_FOR_RANGE[range],
  });

/** `GET /history/state` — point-in-time network levels, newest-last. */
export const useHistoryState = (range: HistoryRange, interval?: string) =>
  useApiQuery<HistoryStateRow[]>(
    'history-state',
    '/history/state',
    SSE_FALLBACK_INTERVAL,
    { range, interval: interval ?? INTERVAL_FOR_RANGE[range] },
  );
