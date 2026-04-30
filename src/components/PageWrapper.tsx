import React from 'react';
import { Stack } from '@mui/material';

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Stack
    sx={{
      backgroundColor: 'background.default',
      px: { xs: 1.5, sm: 2, md: 4 },
      py: { xs: 2, sm: 3, md: 4 },
      width: '100%',
      maxWidth: 800,
      mx: 'auto',
    }}
  >
    {children}
  </Stack>
);

export default PageWrapper;
