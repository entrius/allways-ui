import React from 'react';
import { Box, Typography } from '@mui/material';

interface Props {
  eyebrow?: string;
  title?: React.ReactNode;
  borderBottom?: boolean;
  children: React.ReactNode;
}

const Section: React.FC<Props> = ({
  eyebrow,
  title,
  borderBottom = true,
  children,
}) => (
  <Box
    component="section"
    sx={{
      width: '100%',
      backgroundColor: 'background.default',
      borderBottom: borderBottom ? '1px solid' : 'none',
      borderColor: 'divider',
      px: { xs: 2, sm: 3, md: 6 },
      py: { xs: 6, md: 10 },
    }}
  >
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {eyebrow && (
        <Typography variant="eyebrow" sx={{ display: 'block', mb: 1 }}>
          {eyebrow}
        </Typography>
      )}
      {title && (
        <Typography
          variant="display"
          sx={{
            fontSize: { xs: '1.75rem', md: '2.5rem' },
            letterSpacing: '-0.03em',
            color: 'text.primary',
            mb: { xs: 4, md: 6 },
            maxWidth: 700,
            display: 'block',
          }}
        >
          {title}
        </Typography>
      )}
      {children}
    </Box>
  </Box>
);

export default Section;
