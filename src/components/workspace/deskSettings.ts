import { useCallback, useEffect, useState } from 'react';

// The desk's own settings, behind the desk gear. Remembered per browser.
// (The window is page state and lives on the page, not here.)

export type Spacing = 'comfortable' | 'compact';

export interface DeskSettings {
  // The gap between widgets: the landing card gap, or a tight one.
  spacing: Spacing;
}

const KEY = 'allways-ui.desk.settings';
const DEFAULTS: DeskSettings = { spacing: 'comfortable' };

const read = (): DeskSettings => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<DeskSettings>;
    return {
      spacing:
        parsed.spacing === 'compact' || parsed.spacing === 'comfortable'
          ? parsed.spacing
          : DEFAULTS.spacing,
    };
  } catch {
    return DEFAULTS;
  }
};

export const useDeskSettings = () => {
  const [settings, setSettings] = useState<DeskSettings>(read);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Private mode or blocked storage: settings just don't persist.
    }
  }, [settings]);
  const update = useCallback((patch: Partial<DeskSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);
  const reset = useCallback(() => setSettings(DEFAULTS), []);
  return { settings, update, reset };
};

export const deskChanges = (s: DeskSettings): number =>
  s.spacing === DEFAULTS.spacing ? 0 : 1;
