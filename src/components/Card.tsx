import React from 'react';
import { Box } from '@mui/material';

// Card-less section (cohesive, taostats-style): no bordered/filled box — just a
// hairline divider + vertical rhythm separating sections. The last section's
// trailing divider is dropped.
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      pb: { xs: 2, sm: 2.5 },
      mb: { xs: 2, sm: 2.5 },
      borderBottom: '1px solid',
      borderColor: 'divider',
      '&:last-of-type': { borderBottom: 'none', mb: 0, pb: 0 },
    }}
  >
    {children}
  </Box>
);

export default Card;
