import type { Theme } from '@mui/material/styles';
import { FONTS } from '../../theme';

export const tableHeaderSx = (theme: Theme) => ({
  fontFamily: FONTS.mono,
  fontSize: '0.65rem',
  color: theme.palette.text.secondary,
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
});

export const tableCellSx = (theme: Theme) => ({
  fontFamily: FONTS.mono,
  fontSize: '0.75rem',
  borderBottom: `1px solid ${theme.palette.divider}`,
});
