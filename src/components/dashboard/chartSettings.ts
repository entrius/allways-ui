import { useCallback, useEffect, useState } from 'react';

// The History widget's settings, behind its gear. Remembered per browser.

export interface ChartSettings {
  // The O / H / L / C readout and the window's change above the line.
  // Off by default: the line is the history, the readout is for a look.
  readout: boolean;
}

const KEY = 'allways-ui.chart.settings';
const DEFAULTS: ChartSettings = { readout: false };

const read = (): ChartSettings => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<ChartSettings>;
    return {
      readout:
        typeof parsed.readout === 'boolean' ? parsed.readout : DEFAULTS.readout,
    };
  } catch {
    return DEFAULTS;
  }
};

export const useChartSettings = () => {
  const [settings, setSettings] = useState<ChartSettings>(read);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Private mode or blocked storage: settings just don't persist.
    }
  }, [settings]);
  const update = useCallback((patch: Partial<ChartSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);
  const reset = useCallback(() => setSettings(DEFAULTS), []);
  return { settings, update, reset };
};

// How many settings are away from their defaults, for the gear's badge.
export const chartChanges = (s: ChartSettings): number =>
  s.readout === DEFAULTS.readout ? 0 : 1;
