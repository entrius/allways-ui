import React from 'react';
import { Box, Stack } from '@mui/material';
import { PAGE_FRAME_SX } from './layout/pageFrame';

// A detail page (a transaction, a reservation): the site's frame, its
// cards laid across the frame's full width in two columns where they fit.
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={PAGE_FRAME_SX}>
    <Stack>{children}</Stack>
  </Box>
);

export default PageWrapper;
