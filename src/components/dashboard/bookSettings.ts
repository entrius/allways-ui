import { useCallback, useEffect, useState } from 'react';

// The Order book widget's settings, behind its gear. Remembered per browser.

export interface BookSettings {
  // Desk columns the widget spans.
  width: 1 | 2;
}

const KEY = 'allways-ui.book.settings';
const DEFAULTS: BookSettings = { width: 2 };

const read = (): BookSettings => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<BookSettings>;
    return { width: parsed.width === 1 ? 1 : 2 };
  } catch {
    return DEFAULTS;
  }
};

export const useBookSettings = () => {
  const [settings, setSettings] = useState<BookSettings>(read);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Private mode or blocked storage: settings just don't persist.
    }
  }, [settings]);
  const update = useCallback((patch: Partial<BookSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);
  const reset = useCallback(() => setSettings(DEFAULTS), []);
  return { settings, update, reset };
};

// How many settings are away from their defaults, for the gear's badge.
export const bookChanges = (s: BookSettings): number =>
  s.width === DEFAULTS.width ? 0 : 1;
