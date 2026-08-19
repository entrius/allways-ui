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
      // Tall enough for a full default page of rows plus the find bar and
      // the pager, short enough that the next section is visibly below it.
      height: { xs: 620, md: 760 },
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }}
  >
    <SwapTracker embedded />
  </Box>
);

export default TransactionsSection;
