import React from 'react';
import { Box } from '@mui/material';
import SwapTracker from '../dashboard/SwapTracker';

/**
 * The transaction tape on the network page. On its own page the tape took
 * the whole viewport; here it is one of three stacked sections, so it gets a
 * fixed height and keeps its own internal scroll — the page scroll continues
 * past it to the miners and the charts instead of being swallowed by an
 * unbounded list.
 */
const TransactionsSection: React.FC = () => (
  <Box
    sx={{
      // Sized against the viewport, not a fixed number: the tape takes what
      // the screen has left after the ribbon and the three section headers,
      // so the two collapsed sections below it are visible on load instead
      // of hiding under the fold. Clamped so it stays usable on a short
      // laptop and doesn't sprawl on a tall monitor.
      height: { xs: 620, md: 'clamp(340px, calc(100dvh - 405px), 720px)' },
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }}
  >
    <SwapTracker embedded />
  </Box>
);

export default TransactionsSection;
