import { useCallback, useEffect, useState } from 'react';

// The Rate widget's settings, behind its gear: which facts the ribbon under
// the headline carries. Remembered per browser.

export const RATE_STATS = [
  'high',
  'low',
  'spread',
  'reverse',
  'depth',
  'quotes',
  'vol',
  'swaps',
] as const;
export type RateStat = (typeof RATE_STATS)[number];
export type RateStats = Record<RateStat, boolean>;

export interface RateSettings {
  stats: RateStats;
}

const KEY = 'allways-ui.rate.settings';
const DEFAULTS: RateSettings = {
  // The exchange header's three: the window's high and low, and the
  // spread. The rest are a click away in the gear.
  stats: {
    high: true,
    low: true,
    spread: true,
    reverse: false,
    depth: false,
    quotes: false,
    vol: false,
    swaps: false,
  },
};

const read = (): RateSettings => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<RateSettings>;
    return { stats: { ...DEFAULTS.stats, ...(parsed.stats ?? {}) } };
  } catch {
    return DEFAULTS;
  }
};

export const useRateSettings = () => {
  const [settings, setSettings] = useState<RateSettings>(read);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Private mode or blocked storage: settings just don't persist.
    }
  }, [settings]);
  const update = useCallback((patch: Partial<RateSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);
  const reset = useCallback(() => setSettings(DEFAULTS), []);
  return { settings, update, reset };
};

// How many settings are away from their defaults, for the gear's badge.
export const rateChanges = (s: RateSettings): number =>
  RATE_STATS.filter((k) => s.stats[k] !== DEFAULTS.stats[k]).length;
