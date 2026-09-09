import { useCallback, useEffect, useState } from 'react';

// Port of allways-matrix settings.ts. Theme is not here: the site already
// owns its light/dark mode (ThemeContext), and the panel drives that.

// Which parts of an asset label (row cell and hub header) are drawn. Any
// combination is allowed; the cell keeps a hover title so an all-off label
// is still identifiable.
export interface HeaderParts {
  logo: boolean;
  ticker: boolean;
  network: boolean;
}

export const HEADER_PRESETS: { name: string; parts: HeaderParts }[] = [
  { name: 'full', parts: { logo: true, ticker: true, network: true } },
  { name: 'compact', parts: { logo: true, ticker: true, network: false } },
  { name: 'minimal', parts: { logo: false, ticker: true, network: false } },
  { name: 'logos', parts: { logo: true, ticker: false, network: false } },
];

export interface MatrixSettings {
  header: HeaderParts;
  favoritesOnly: boolean;
  // Chain ids. Hidden assets are collapsed out of the sheet; favorites are
  // starred and, with favoritesOnly, the only non-hub assets shown.
  hidden: string[];
  favorites: string[];
}

const KEY = 'allways-ui.rate-matrix.settings';

const DEFAULTS: MatrixSettings = {
  header: HEADER_PRESETS[0].parts,
  favoritesOnly: false,
  hidden: [],
  favorites: [],
};

const read = (): MatrixSettings => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<MatrixSettings>;
    return {
      header: { ...DEFAULTS.header, ...(parsed.header ?? {}) },
      favoritesOnly: parsed.favoritesOnly ?? false,
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
    };
  } catch {
    return DEFAULTS;
  }
};

const toggle = (list: string[], id: string): string[] =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export const sameParts = (a: HeaderParts, b: HeaderParts): boolean =>
  a.logo === b.logo && a.ticker === b.ticker && a.network === b.network;

// Settings live in localStorage — a per-viewer convenience, nothing else
// reads them.
export const useMatrixSettings = () => {
  const [settings, setSettings] = useState<MatrixSettings>(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Private mode or blocked storage: settings just don't persist.
    }
  }, [settings]);

  const update = useCallback((patch: Partial<MatrixSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);
  const toggleHidden = useCallback((id: string) => {
    setSettings((s) => ({ ...s, hidden: toggle(s.hidden, id) }));
  }, []);
  const toggleFavorite = useCallback((id: string) => {
    setSettings((s) => ({ ...s, favorites: toggle(s.favorites, id) }));
  }, []);
  const reset = useCallback(() => setSettings(DEFAULTS), []);

  return { settings, update, toggleHidden, toggleFavorite, reset };
};
