import React from 'react';
import { Box, Typography } from '@mui/material';
import { COLORS, FONTS } from '../../theme';

const Hero: React.FC = () => (
  <Box
    sx={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100%',
      overflow: 'hidden',
    }}
  >
    {/* Subtle radial glow behind text */}
    <Box
      sx={{
        position: 'absolute',
        width: { xs: '400px', md: '700px' },
        height: { xs: '400px', md: '700px' },
        borderRadius: '50%',
        background: `radial-gradient(circle, ${COLORS.primary}15 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}
    />

    {/* Main title */}
    <Typography
      sx={{
        fontFamily: FONTS.heading,
        fontWeight: 900,
        fontSize: { xs: '3.5rem', sm: '5rem', md: '7rem', lg: '9rem' },
        letterSpacing: '-0.04em',
        lineHeight: 1,
        color: COLORS.white,
        textTransform: 'uppercase',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}
    >
      ALLWAYS
    </Typography>

    {/* Subtitle */}
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.95rem' },
        color: COLORS.textSecondary,
        mt: { xs: 2, md: 3 },
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        position: 'relative',
        zIndex: 1,
      }}
    >
      OTC Swap Engine
    </Typography>

    {/* Thin decorative line */}
    <Box
      sx={{
        width: '60px',
        height: '1px',
        backgroundColor: COLORS.primary,
        mt: 3,
        position: 'relative',
        zIndex: 1,
      }}
    />
  </Box>
);

export default Hero;
