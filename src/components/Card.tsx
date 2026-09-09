import React from 'react';
import { Box } from '@mui/material';

// A unit of information a person reads, in the landing page's card
// treatment: 1px hairline, square, blue border on hover, the landing
// padding. Stacks of these use the landing grid gap.
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      p: { xs: 2.5, md: 3 },
      mb: { xs: 2, md: 3 },
      borderRadius: 0,
      backgroundColor: 'background.default',
      border: '1px solid',
      borderColor: 'divider',
      transition: 'border-color 120ms',
      '&:hover': { borderColor: 'primary.main' },
    }}
  >
    {children}
  </Box>
);

export default Card;
