import React from 'react';
import { Box, type BoxProps } from '@mui/material';

const HoverCard: React.FC<BoxProps> = ({ sx, children, ...rest }) => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 0,
      transition: 'border-color 120ms',
      '&:hover': { borderColor: 'primary.main' },
      ...sx,
    }}
    {...rest}
  >
    {children}
  </Box>
);

export default HoverCard;
