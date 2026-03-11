import { createTheme } from '@mui/material/styles';

// Shared color constants - use these outside MUI components
export const COLORS = {
  primary: '#10b981',
  primaryLight: '#34d399',
  primaryDark: '#059669',
  bg: '#000000',
  surface: '#0a0a0a',
  surfaceLight: '#111111',
  surfaceElevated: '#161616',
  white: '#ffffff',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.5)',
  textMuted: 'rgba(255, 255, 255, 0.3)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderMedium: 'rgba(255, 255, 255, 0.2)',
  ticker: '#10b981',
  tickerText: '#000000',
} as const;

export const FONTS = {
  heading: '"Inter", "Helvetica Neue", sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", monospace',
  accent: '"JetBrains Mono", "Courier New", monospace',
} as const;

// Module augmentation
declare module '@mui/material/styles' {
  interface Palette {
    border: { subtle: string; light: string; medium: string };
    surface: { main: string; light: string; elevated: string };
  }
  interface PaletteOptions {
    border?: { subtle: string; light: string; medium: string };
    surface?: { main: string; light: string; elevated: string };
  }
  interface TypographyVariants {
    mono: React.CSSProperties;
    monoSmall: React.CSSProperties;
    display: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    mono?: React.CSSProperties;
    monoSmall?: React.CSSProperties;
    display?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    mono: true;
    monoSmall: true;
    display: true;
  }
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: COLORS.primary },
    background: {
      default: COLORS.bg,
      paper: COLORS.surface,
    },
    text: {
      primary: COLORS.textPrimary,
      secondary: COLORS.textSecondary,
    },
    divider: COLORS.border,
    border: {
      subtle: COLORS.border,
      light: COLORS.borderLight,
      medium: COLORS.borderMedium,
    },
    surface: {
      main: COLORS.surface,
      light: COLORS.surfaceLight,
      elevated: COLORS.surfaceElevated,
    },
  },
  typography: {
    fontFamily: FONTS.body,
    h1: { fontFamily: FONTS.heading, letterSpacing: '-0.04em', fontWeight: 700 },
    h2: { fontFamily: FONTS.heading, letterSpacing: '-0.03em', fontWeight: 700 },
    h3: { fontFamily: FONTS.heading, letterSpacing: '-0.02em', fontWeight: 600 },
    h4: { fontFamily: FONTS.heading, letterSpacing: '-0.02em', fontWeight: 600 },
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
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFamily: FONTS.body },
      },
    },
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontFamily: FONTS.mono,
          fontWeight: 500,
          borderRadius: 0,
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 2,
          border: `1px solid ${COLORS.border}`,
          backgroundColor: 'transparent',
        },
      },
    },
  },
});

export default theme;
