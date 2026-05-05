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

const lightPalette = {
  primary: BRAND.primary,
  bg: BRAND.offwhite,
  surface: BRAND.white,
  surfaceLight: BRAND.gray,
  surfaceElevated: BRAND.gray,
  textPrimary: BRAND.woodsmoke,
  textSecondary: 'rgba(9, 11, 13, 0.6)',
  textMuted: 'rgba(9, 11, 13, 0.4)',
  border: BRAND.gray,
  borderLight: BRAND.gray,
  borderMedium: 'rgba(9, 11, 13, 0.25)',
  statusActive: 'var(--color-status-active)',
  statusFulfilled: 'var(--color-status-fulfilled)',
  statusCompleted: 'var(--color-status-completed)',
  statusTimedOut: 'var(--color-status-timed-out)',
  statusCollateral: 'var(--color-status-collateral)',
  statusVote: 'var(--color-status-vote)',
  statusMinerActivated: 'var(--color-status-miner-activated)',
  assetBtc: '#f7931a',
  assetTao: BRAND.woodsmoke,
} as const;

// Dark surface tints are pre-computed equivalents of the index.css color-mix()
// expressions so theme.palette.surface.* and var(--color-surface-*) resolve to
// the same color: 92% woodsmoke + 8% white = #1d1f20, 86% + 14% = #2b2d2f.
const darkPalette = {
  ...lightPalette,
  bg: BRAND.woodsmoke,
  surface: BRAND.woodsmoke,
  surfaceLight: '#1d1f20',
  surfaceElevated: '#2b2d2f',
  textPrimary: BRAND.white,
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.12)',
  borderLight: 'rgba(255, 255, 255, 0.18)',
  borderMedium: 'rgba(255, 255, 255, 0.25)',
  assetTao: BRAND.white,
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
  const p = mode === 'light' ? lightPalette : darkPalette;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: p.primary,
        light: p.primary,
        dark: p.primary,
        contrastText: BRAND.white,
      },
      background: {
        default: p.bg,
        paper: p.surface,
      },
      text: {
        primary: p.textPrimary,
        secondary: p.textSecondary,
      },
      divider: p.border,
      border: {
        subtle: p.border,
        light: p.borderLight,
        medium: p.borderMedium,
      },
      surface: {
        main: p.surface,
        light: p.surfaceLight,
        elevated: p.surfaceElevated,
      },
      status: {
        active: p.statusActive,
        fulfilled: p.statusFulfilled,
        completed: p.statusCompleted,
        timedOut: p.statusTimedOut,
        collateral: p.statusCollateral,
        vote: p.statusVote,
        minerActivated: p.statusMinerActivated,
      },
      asset: {
        btc: p.assetBtc,
        tao: p.assetTao,
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
            fontWeight: 400,
            letterSpacing: 0,
            borderRadius: 0,
            backgroundColor: v('surface'),
            color: v('text-primary'),
            border: `1px solid ${v('border-medium')}`,
            padding: '6px 10px',
            boxShadow: 'none',
          },
          arrow: {
            color: v('surface'),
            '&::before': {
              border: `1px solid ${v('border-medium')}`,
              backgroundColor: v('surface'),
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
