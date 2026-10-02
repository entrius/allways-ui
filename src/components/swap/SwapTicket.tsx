import React from 'react';
import { Box, Typography } from '@mui/material';
import { FONTS } from '../../theme';
import { chainSymbol } from '../../utils/format';
import SwapWidget from './SwapWidget';

// The desk's order ticket: the selected direction, ready to send. A plain
// hairline frame with the swap box inside it and no widget chrome: nothing
// to drag, put away or stretch.
const SwapTicket: React.FC<{ from: string; to: string }> = ({ from, to }) => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: 'border.medium',
      backgroundColor: 'background.default',
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'primary.main',
        }}
      >
        Swap
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'text.secondary',
          whiteSpace: 'nowrap',
        }}
      >
        {chainSymbol(from)} → {chainSymbol(to)}
      </Typography>
    </Box>
    <SwapWidget from={from} to={to} />
  </Box>
);

export default SwapTicket;
