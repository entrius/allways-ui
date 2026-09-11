import { useCallback, useEffect, useState } from 'react';

// The Watchlist widget's settings, behind its gear. Remembered per browser.

export const ALL_HUBS = 'all';

// Which of a pair's two directions the list shows. Every pair is two
// instruments (SOL/BTC and BTC/SOL), so 'both' lists each pair twice;
// 'from' keeps the route the hub sends on (SOL/BTC), 'to' the route that
// arrives at the hub (BTC/SOL).
export type Directions = 'both' | 'from' | 'to';

export interface WatchlistSettings {
  // Hub scope: ALL_HUBS files every route once under the hub that settles
  // it; a hub id shows that hub's whole network.
  scope: string;
  directions: Directions;
}

const KEY = 'allways-ui.watchlist.settings';
export const WATCHLIST_DEFAULTS: WatchlistSettings = {
  scope: ALL_HUBS,
  directions: 'both',
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
  (s.directions === DEFAULTS.directions ? 0 : 1);
