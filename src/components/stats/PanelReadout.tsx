import React from 'react';
import { Typography } from '@mui/material';
import { FONTS } from '../../theme';

/**
 * The one summary figure a Panel shows top right ("$4,369 in range"): the
 * emphasised-number size on the mono scale, so every chart's readout matches.
 */
const PanelReadout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Typography
    sx={{
      fontFamily: FONTS.mono,
      fontSize: '0.82rem',
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      color: 'text.primary',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </Typography>
);

export default PanelReadout;
