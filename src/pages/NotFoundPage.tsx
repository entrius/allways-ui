import React from 'react';
import { Box, Stack, Typography, Link } from '@mui/material';
import { COLORS, FONTS } from '../theme';

const NotFoundPage: React.FC = () => (
  <Box
    sx={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.bg,
    }}
  >
    <Stack alignItems="center" gap={2}>
      <Typography
        sx={{
          fontFamily: FONTS.heading,
          fontWeight: 900,
          fontSize: '4rem',
          letterSpacing: '-0.04em',
          color: COLORS.white,
        }}
      >
        404
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.85rem',
          color: COLORS.textSecondary,
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
          color: COLORS.primary,
          mt: 2,
          '&:hover': { color: COLORS.primaryLight },
        }}
      >
        Back to home
      </Link>
    </Stack>
  </Box>
);

export default NotFoundPage;
