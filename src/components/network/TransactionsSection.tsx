import React from 'react';
import { Box } from '@mui/material';
import SwapTracker from '../dashboard/SwapTracker';

/**
 * The transaction tape on the network page. It is as tall as the rows it
 * shows and scrolls with the page, no scrollbar of its own; the page-size
 * picker under it is what bounds it.
 */
const TransactionsSection: React.FC = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
    <SwapTracker embedded />
  </Box>
);

export default TransactionsSection;
