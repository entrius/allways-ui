import React from 'react';
import { Box } from '@mui/material';

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      p: 2,
      mb: 2,
      borderRadius: 0,
      backgroundColor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
    }}
  >
    {children}
  </Box>
);

export default Card;
