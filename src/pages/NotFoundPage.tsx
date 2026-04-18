import React from 'react';
import { Box, Stack, Typography, Link } from '@mui/material';
import { FONTS } from '../theme';

const NotFoundPage: React.FC = () => (
  <Box
    sx={{
      width: '100vw',
      height: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'background.default',
    }}
  >
    <Stack alignItems="center" gap={2}>
      <Typography
        sx={{
          fontFamily: FONTS.heading,
          fontWeight: 900,
          fontSize: '4rem',
          letterSpacing: '-0.04em',
          color: 'text.primary',
        }}
      >
        404
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.85rem',
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Page not found
      </Typography>
      <Link
        href="/"
        underline="none"
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.8rem',
          color: 'primary.main',
          mt: 2,
          '&:hover': { color: 'primary.light' },
        }}
      >
        Back to home
      </Link>
    </Stack>
  </Box>
);

export default NotFoundPage;
