import { createTheme, Theme } from '@mui/material/styles';

// Font constants (shared across all themes)
export const FONTS = {
  heading: '"Inter", "Helvetica Neue", sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: '"DM Mono", "JetBrains Mono", monospace',
  accent: '"JetBrains Mono", "Courier New", monospace',
} as const;

// ---------- Palette definitions ----------

const lightPalette = {
  primary: '#10b981',
  primaryLight: '#34d399',
  primaryDark: '#059669',
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceLight: '#f1f5f9',
  surfaceElevated: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#cbd5e1',
  borderMedium: '#94a3b8',
} as const;

const darkPalette = {
  primary: '#10b981',
  primaryLight: '#34d399',
  primaryDark: '#059669',
  bg: '#000000',
  surface: '#0a0a0a',
  surfaceLight: '#111111',
  surfaceElevated: '#161616',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.5)',
  textMuted: 'rgba(255, 255, 255, 0.3)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderMedium: 'rgba(255, 255, 255, 0.2)',
} as const;

// ---------- Module augmentation ----------

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

// ---------- Theme factory ----------

export type ThemeMode = 'light' | 'dark';

export function createAppTheme(mode: ThemeMode): Theme {
  const p = mode === 'light' ? lightPalette : darkPalette;

  return createTheme({
    palette: {
      mode,
      primary: { main: p.primary, light: p.primaryLight, dark: p.primaryDark },
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
            borderRadius: 0,
            border: `1px solid ${p.border}`,
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
