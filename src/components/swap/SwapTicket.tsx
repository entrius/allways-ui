import React from 'react';
import { Box, Link, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { FONTS } from '../../theme';
import SwapWidget from './SwapWidget';

// The product the desk's swap box comes from: named on the ticket and one
// click from its own site. Apps built on Allways are their own products, so
// the ticket says whose it is rather than calling itself the network's swap.
const PRODUCT = {
  name: 'Allways Access',
  url: 'https://allways.venturalabs.ai/',
};

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
        alignItems: 'center',
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
          whiteSpace: 'nowrap',
        }}
      >
        {PRODUCT.name}
      </Typography>
      <Link
        href={PRODUCT.url}
        target="_blank"
        rel="noopener noreferrer"
        underline="none"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          fontFamily: FONTS.mono,
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          whiteSpace: 'nowrap',
          '&:hover': { color: 'primary.main' },
        }}
      >
        Open app
        <OpenInNewIcon sx={{ fontSize: 12 }} />
      </Link>
    </Box>
    <SwapWidget from={from} to={to} />
  </Box>
);

export default SwapTicket;
