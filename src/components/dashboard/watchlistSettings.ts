import { useCallback, useEffect, useState } from 'react';

// The Watchlist widget's settings, behind its gear. Remembered per browser.

export const ALL_HUBS = 'all';

export interface WatchlistSettings {
  // Hub scope: ALL_HUBS files every route once under the hub that settles
  // it; a hub id shows that hub's whole network.
  scope: string;
}

const KEY = 'allways-ui.watchlist.settings';
const DEFAULTS: WatchlistSettings = { scope: ALL_HUBS };

const read = (): WatchlistSettings => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<WatchlistSettings>;
    return {
      scope: typeof parsed.scope === 'string' ? parsed.scope : DEFAULTS.scope,
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
