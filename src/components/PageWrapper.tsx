import React from 'react';
import { Box, Stack } from '@mui/material';
import { PAGE_FRAME_SX } from './layout/pageFrame';

// A reading page (a transaction, a reservation): the site's frame, with the
// content held to a reading width against the frame's left edge, where the
// landing page's text sits too.
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={PAGE_FRAME_SX}>
    <Stack sx={{ maxWidth: 960 }}>{children}</Stack>
  </Box>
);

export default PageWrapper;
