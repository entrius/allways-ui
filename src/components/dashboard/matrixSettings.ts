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

// How many rows the sheet shows before it scrolls. The widget is as tall
// as its rows up to this, and shorter when there are fewer.
export const MAX_ROWS_OPTIONS = [5, 10, 15, 20] as const;

// How many desk columns the widget spans: 'fit' takes what the sheet's
// columns need (up to the whole desk), a number sets it.
export type MatrixWidth = 'fit' | 1 | 2 | 3;
export const MATRIX_WIDTHS: MatrixWidth[] = ['fit', 1, 2, 3];

export interface MatrixSettings {
  header: HeaderParts;
  width: MatrixWidth;
  favoritesOnly: boolean;
  // Only entries with a live quote: a subnet nobody is quoting yet is a row
  // of dashes. Hubs always show.
  quotedOnly: boolean;
  maxRows: number;
  // Chain ids. Hidden assets are collapsed out of the sheet; favorites are
  // starred and, with favoritesOnly, the only non-hub assets shown.
  hidden: string[];
  favorites: string[];
}

const KEY = 'allways-ui.rate-matrix.settings';

const DEFAULTS: MatrixSettings = {
  header: HEADER_PRESETS[0].parts,
  width: 'fit',
  favoritesOnly: false,
  quotedOnly: true,
  maxRows: 10,
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
      width: MATRIX_WIDTHS.includes(parsed.width as MatrixWidth)
        ? (parsed.width as MatrixWidth)
        : DEFAULTS.width,
      favoritesOnly: parsed.favoritesOnly ?? false,
      quotedOnly: parsed.quotedOnly ?? DEFAULTS.quotedOnly,
      maxRows: MAX_ROWS_OPTIONS.includes(
        parsed.maxRows as (typeof MAX_ROWS_OPTIONS)[number],
      )
        ? (parsed.maxRows as number)
        : DEFAULTS.maxRows,
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
  // The desk's reset: every setting back, the stars kept (they are a
  // person's picks, not a setting).
  const resetKeepStars = useCallback(
    () => setSettings((s) => ({ ...DEFAULTS, favorites: s.favorites })),
    [],
  );

  return {
    settings,
    update,
    toggleHidden,
    toggleFavorite,
    reset,
    resetKeepStars,
  };
};
