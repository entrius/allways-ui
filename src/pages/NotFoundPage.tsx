import React from 'react';
import { Stack, Typography } from '@mui/material';

const NotFoundPage: React.FC = () => (
  <Stack
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
    }}
    direction="row"
    gap={2}
  >
    <Typography variant="h4">404 Not Found</Typography>
  </Stack>
);

export default NotFoundPage;
