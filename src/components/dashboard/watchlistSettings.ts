import { useCallback, useEffect, useState } from 'react';

// The Watchlist widget's settings, behind its gear. Remembered per browser.

export const ALL_HUBS = 'all';

// Which of a pair's two directions the list shows. Every pair is two
// instruments (SOL/BTC and BTC/SOL), so 'both' lists each pair twice;
// 'from' keeps the route the hub sends on (SOL/BTC), 'to' the route that
// arrives at the hub (BTC/SOL).
export type Directions = 'both' | 'from' | 'to';

// The optional columns, in the order they sit on the row. Symbol and
// Last always show.
export const COLUMNS = [
  'spread',
  'depth',
  'vol',
  'swaps',
  'quotes',
  'chg',
] as const;
export type Column = (typeof COLUMNS)[number];
export type Columns = Record<Column, boolean>;

export interface WatchlistSettings {
  // Hub scope: ALL_HUBS files every route once under the hub that settles
  // it; a hub id shows that hub's whole network.
  scope: string;
  directions: Directions;
  columns: Columns;
}

const KEY = 'allways-ui.watchlist.settings';
export const WATCHLIST_DEFAULTS: WatchlistSettings = {
  scope: ALL_HUBS,
  directions: 'both',
  // Compact by default: the columns a TradingView watchlist carries.
  columns: {
    spread: true,
    depth: true,
    vol: true,
    swaps: false,
    quotes: false,
    chg: true,
  },
};
const DEFAULTS = WATCHLIST_DEFAULTS;
const isDirections = (v: unknown): v is Directions =>
  v === 'both' || v === 'from' || v === 'to';

const read = (): WatchlistSettings => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<WatchlistSettings>;
    return {
      scope: typeof parsed.scope === 'string' ? parsed.scope : DEFAULTS.scope,
      directions: isDirections(parsed.directions)
        ? parsed.directions
        : DEFAULTS.directions,
      columns: { ...DEFAULTS.columns, ...(parsed.columns ?? {}) },
    };
  } catch {
    return DEFAULTS;
  }
};

export const useWatchlistSettings = () => {
  const [settings, setSettings] = useState<WatchlistSettings>(read);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Private mode or blocked storage: settings just don't persist.
    }
  }, [settings]);
  const update = useCallback((patch: Partial<WatchlistSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);
  const reset = useCallback(() => setSettings(DEFAULTS), []);
  return { settings, update, reset };
};

// How many settings are away from their defaults, for the gear's badge.
export const watchlistChanges = (s: WatchlistSettings): number =>
  (s.scope === DEFAULTS.scope ? 0 : 1) +
  (s.directions === DEFAULTS.directions ? 0 : 1) +
  COLUMNS.filter((c) => s.columns[c] !== DEFAULTS.columns[c]).length;
