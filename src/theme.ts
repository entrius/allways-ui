import { createTheme } from '@mui/material/styles';

export const STATUS_COLORS = {
  neutral: '#9ca3af',
  success: '#4ade80',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#58a6ff',
} as const;

export const TEXT_OPACITY = {
  primary: 1,
  secondary: 0.7,
  tertiary: 0.5,
  muted: 0.4,
  faint: 0.3,
  ghost: 0.2,
} as const;

declare module '@mui/material/styles' {
  interface Palette {
    border: {
      subtle: string;
      light: string;
      medium: string;
    };
    surface: {
      transparent: string;
      subtle: string;
      light: string;
      elevated: string;
    };
  }

  interface PaletteOptions {
    border?: {
      subtle: string;
      light: string;
      medium: string;
    };
    surface?: {
      transparent: string;
      subtle: string;
      light: string;
      elevated: string;
    };
  }

  interface TypographyVariants {
    mono: React.CSSProperties;
    monoSmall: React.CSSProperties;
    sectionTitle: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    mono?: React.CSSProperties;
    monoSmall?: React.CSSProperties;
    sectionTitle?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    mono: true;
    monoSmall: true;
    sectionTitle: true;
  }
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1d37fc',
    },
    secondary: {
      main: '#fff30d',
    },
    background: {
      default: '#000000',
      paper: '#0a0f1f',
    },
    text: {
      primary: '#ffffff',
      secondary: '#7d7d7d',
    },
    divider: '#ffffff',
    border: {
      subtle: 'rgba(255, 255, 255, 0.05)',
      light: 'rgba(255, 255, 255, 0.1)',
      medium: 'rgba(255, 255, 255, 0.2)',
    },
    surface: {
      transparent: 'transparent',
      subtle: 'rgba(255, 255, 255, 0.02)',
      light: 'rgba(255, 255, 255, 0.05)',
      elevated: '#161b22',
    },
  },
  typography: {
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    },
    h2: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    },
    h3: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    },
    h4: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    },
    h5: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    },
    h6: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    },
    mono: {
      fontFamily: '"JetBrains Mono", monospace',
      fontWeight: 500,
    },
    monoSmall: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '0.7rem',
      fontWeight: 600,
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
    },
    sectionTitle: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '1rem',
      fontWeight: 600,
      color: '#fff',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily:
            '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'transparent',
        },
      },
    },
  },
});

export default theme;
