import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

// A unit of information a person reads, in the landing page's card
// treatment: 1px hairline, square, blue border on hover, the landing
// padding. Stacks of these use the landing grid gap; inside a grid pass
// `sx={{ mb: 0 }}` and let the grid's gap space them.
const Card: React.FC<{ children: React.ReactNode; sx?: SxProps<Theme> }> = ({
  children,
  sx,
}) => (
  <Box
    sx={[
      {
        p: { xs: 2.5, md: 3 },
        mb: { xs: 2, md: 3 },
        borderRadius: 0,
        backgroundColor: 'background.default',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'border-color 120ms',
        '&:hover': { borderColor: 'primary.main' },
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);

export default Card;
