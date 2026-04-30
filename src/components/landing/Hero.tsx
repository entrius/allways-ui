import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { FONTS } from '../../theme';
import { useThemeMode } from '../../ThemeContext';

const Hero: React.FC = () => {
  const { mode } = useThemeMode();

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        borderBottom: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        backgroundColor: 'background.default',
      }}
    >
      {/* Mesh background art */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/hero/allways-1.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          backgroundRepeat: 'no-repeat',
          opacity: mode === 'dark' ? 0.18 : 0.22,
          filter: mode === 'dark' ? 'invert(1)' : 'none',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          maxWidth: 1400,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 6 },
          py: { xs: 8, sm: 10, md: 16 },
          minHeight: { xs: '60vh', md: '70vh' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Typography variant="eyebrow" sx={{ mb: { xs: 2, md: 3 } }}>
          Bittensor · Subnet 7
        </Typography>

        <Typography
          variant="display"
          sx={{
            fontSize: { xs: '2.5rem', sm: '3.5rem', md: '5rem' },
            lineHeight: 0.95,
            color: 'text.primary',
            maxWidth: 1100,
          }}
        >
          Universal
          <br />
          transaction layer.
        </Typography>

        <Typography
          sx={{
            fontFamily: FONTS.body,
            fontSize: { xs: '1rem', md: '1.25rem' },
            color: 'text.secondary',
            mt: { xs: 2.5, md: 4 },
            maxWidth: 620,
            lineHeight: 1.5,
          }}
        >
          Building trustless peer to peer transactions between all digital
          assets. No custodian. No wrapped assets.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ mt: { xs: 4, md: 5 } }}
        >
          <Button
            component={RouterLink}
            to="/swap"
            variant="contained"
            size="large"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              borderRadius: 0,
              px: 4,
              py: 1.5,
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-white)',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: 'var(--color-primary)',
                boxShadow: 'none',
              },
            }}
          >
            Exchange
          </Button>
          <Button
            component={RouterLink}
            to="/dashboard"
            variant="outlined"
            size="large"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              borderRadius: 0,
              px: 4,
              py: 1.5,
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
                backgroundColor: 'transparent',
              },
            }}
          >
            Open dashboard
          </Button>
          <Button
            component={RouterLink}
            to="/agents"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'transparent',
              },
            }}
          >
            For agents
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default Hero;
