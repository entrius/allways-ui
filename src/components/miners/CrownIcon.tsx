import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

/**
 * Outline-only crown glyph. Inherits the surrounding text color via
 * currentColor so callers can tint it (e.g. BTC-orange) without prop drilling.
 */
const CrownIcon: React.FC<{
  size?: number;
  color?: string;
  sx?: SxProps<Theme>;
}> = ({ size = 12, color, sx }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      verticalAlign: '-1px',
      mr: 0.5,
      color: color ?? 'asset.btc',
      ...sx,
    }}
    aria-hidden
  >
    <svg
      width={size}
      height={(size * 10) / 12}
      viewBox="0 0 14 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M1 8 L2 2 L5 5 L7 1 L9 5 L12 2 L13 8 L1 8" />
      <line x1="1" y1="10" x2="13" y2="10" />
    </svg>
  </Box>
);

export default CrownIcon;
