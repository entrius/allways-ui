import { createTheme, Theme } from '@mui/material/styles';

// Font constants (shared across all themes)
export const FONTS = {
  heading: '"Inter", "Helvetica Neue", sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", monospace',
  accent: '"JetBrains Mono", "Courier New", monospace',
} as const;

// Brand palette — must mirror the CSS variables in index.css.
// MUI's createTheme needs real color strings (not var()) so it can run
// darken/lighten/getContrastText internally without throwing.
const BRAND = {
  primary: '#0052ff',
  secondary: '#90afff',
  white: '#ffffff',
  offwhite: '#fbfbfb',
  gray: '#eef0f3',
  woodsmoke: '#090b0d',
} as const;

// All theme-aware colors resolve through CSS variables in index.css, so
// light and dark mode share one palette here. The CSS variables (and their
// [data-theme='dark'] overrides) are the single source of truth.
const PALETTE = {
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surfaceLight: 'var(--color-surface-light)',
  surfaceElevated: 'var(--color-surface-elevated)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textMuted: 'var(--color-text-muted)',
  border: 'var(--color-border)',
  borderLight: 'var(--color-border-light)',
  borderMedium: 'var(--color-border-medium)',
  statusActive: 'var(--color-status-active)',
  statusFulfilled: 'var(--color-status-fulfilled)',
  statusCompleted: 'var(--color-status-completed)',
  statusTimedOut: 'var(--color-status-timed-out)',
  statusCollateral: 'var(--color-status-collateral)',
  statusVote: 'var(--color-status-vote)',
  statusMinerActivated: 'var(--color-status-miner-activated)',
  assetBtc: 'var(--color-asset-btc)',
  assetTao: 'var(--color-asset-tao)',
} as const;

declare module '@mui/material/styles' {
  interface Palette {
    border: { subtle: string; light: string; medium: string };
    surface: { main: string; light: string; elevated: string };
    status: {
      active: string;
      fulfilled: string;
      completed: string;
      timedOut: string;
      collateral: string;
      vote: string;
      minerActivated: string;
    };
    asset: { btc: string; tao: string };
  }
  interface PaletteOptions {
    border?: { subtle: string; light: string; medium: string };
    surface?: { main: string; light: string; elevated: string };
    status?: {
      active: string;
      fulfilled: string;
      completed: string;
      timedOut: string;
      collateral: string;
      vote: string;
      minerActivated: string;
    };
    asset?: { btc: string; tao: string };
  }
  interface TypographyVariants {
    mono: React.CSSProperties;
    monoSmall: React.CSSProperties;
    display: React.CSSProperties;
    eyebrow: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    mono?: React.CSSProperties;
    monoSmall?: React.CSSProperties;
    display?: React.CSSProperties;
    eyebrow?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    mono: true;
    monoSmall: true;
    display: true;
    eyebrow: true;
  }
}

// ── CSS variable accessor (for component-level styles) ──
const v = (name: string) => `var(--color-${name})`;

export type ThemeMode = 'light' | 'dark';

export function createAppTheme(mode: ThemeMode): Theme {
  return createTheme({
    palette: {
      mode,
      // primary is the only entry that needs real color values — MUI runs
      // darken/lighten/getContrastText on it during createPalette.
      primary: {
        main: BRAND.primary,
        light: BRAND.primary,
        dark: BRAND.primary,
        contrastText: BRAND.white,
      },
      background: {
        default: PALETTE.bg,
        paper: PALETTE.surface,
      },
      text: {
        primary: PALETTE.textPrimary,
        secondary: PALETTE.textSecondary,
      },
      divider: PALETTE.border,
      border: {
        subtle: PALETTE.border,
        light: PALETTE.borderLight,
        medium: PALETTE.borderMedium,
      },
      surface: {
        main: PALETTE.surface,
        light: PALETTE.surfaceLight,
        elevated: PALETTE.surfaceElevated,
      },
      status: {
        active: PALETTE.statusActive,
        fulfilled: PALETTE.statusFulfilled,
        completed: PALETTE.statusCompleted,
        timedOut: PALETTE.statusTimedOut,
        collateral: PALETTE.statusCollateral,
        vote: PALETTE.statusVote,
        minerActivated: PALETTE.statusMinerActivated,
      },
      asset: {
        btc: PALETTE.assetBtc,
        tao: PALETTE.assetTao,
      },
    },
    typography: {
      fontFamily: FONTS.body,
      h1: {
        fontFamily: FONTS.heading,
        letterSpacing: '-0.04em',
        fontWeight: 700,
      },
      h2: {
        fontFamily: FONTS.heading,
        letterSpacing: '-0.03em',
        fontWeight: 700,
      },
      h3: {
        fontFamily: FONTS.heading,
        letterSpacing: '-0.02em',
        fontWeight: 600,
      },
      h4: {
        fontFamily: FONTS.heading,
        letterSpacing: '-0.02em',
        fontWeight: 600,
      },
      h5: { fontFamily: FONTS.heading, fontWeight: 600 },
      h6: { fontFamily: FONTS.heading, fontWeight: 600 },
      display: {
        fontFamily: FONTS.heading,
        fontWeight: 900,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        textTransform: 'uppercase',
      },
      mono: {
        fontFamily: FONTS.mono,
        fontWeight: 400,
      },
      monoSmall: {
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        fontWeight: 400,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      },
      eyebrow: {
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        fontWeight: 400,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: v('primary'),
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { fontFamily: FONTS.body },
          '::selection': {
            backgroundColor: v('primary'),
            color: v('white'),
          },
        },
      },
      MuiButtonBase: {
        defaultProps: { disableRipple: true },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontFamily: FONTS.mono,
            fontWeight: 500,
            borderRadius: 0,
          },
          containedPrimary: {
            backgroundColor: v('primary'),
            color: v('white'),
            '&:hover': {
              backgroundColor: v('primary'),
            },
            '&:active': {
              backgroundColor: v('primary'),
            },
            '&:focus-visible': {
              backgroundColor: v('primary'),
            },
          },
          outlinedPrimary: {
            borderColor: v('primary'),
            color: v('primary'),
            '&:hover': {
              borderColor: v('primary'),
              color: v('primary'),
              backgroundColor: 'transparent',
            },
            '&:active': {
              borderColor: v('primary'),
              color: v('primary'),
            },
          },
          textPrimary: {
            color: v('primary'),
            '&:hover': {
              color: v('primary'),
              backgroundColor: 'transparent',
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontFamily: FONTS.body,
            fontSize: '0.75rem',
            borderRadius: 0,
            backgroundColor: v('surface-elevated'),
            color: v('text-primary'),
            border: `1px solid ${v('border-light')}`,
            padding: '8px 12px',
          },
          arrow: {
            color: v('surface-elevated'),
            '&::before': {
              border: `1px solid ${v('border-light')}`,
            },
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 0,
            border: `1px solid ${v('border')}`,
            backgroundColor: 'transparent',
          },
        },
      },
    },
  });
}

// Default export for backwards compat during migration
const theme = createAppTheme('light');
export default theme;
