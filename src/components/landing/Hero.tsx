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
      {/* Brand background: a soft blue wash drifting in from the top right
          (matches the Allways social art) instead of the old mesh photo. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            mode === 'dark'
              ? 'radial-gradient(1100px 640px at 88% 18%, rgba(0, 82, 255, 0.18), transparent 65%)'
              : 'radial-gradient(1100px 640px at 88% 18%, rgba(0, 82, 255, 0.10), transparent 65%), linear-gradient(120deg, rgba(0, 82, 255, 0) 55%, rgba(0, 82, 255, 0.05) 100%)',
          pointerEvents: 'none',
        }}
      />
      {/* Thin concentric circle line-work, cropped by the hero edge like the
          brand header art. */}
      <Box
        aria-hidden
        component="svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMaxYMid slice"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: mode === 'dark' ? 0.5 : 1,
        }}
      >
        <circle
          cx="1050"
          cy="240"
          r="330"
          fill="none"
          stroke="#0052ff"
          strokeOpacity="0.22"
          strokeWidth="1"
        />
        <circle
          cx="985"
          cy="540"
          r="420"
          fill="none"
          stroke="#0052ff"
          strokeOpacity="0.14"
          strokeWidth="1"
        />
        <circle
          cx="1180"
          cy="620"
          r="260"
          fill="none"
          stroke="#0052ff"
          strokeOpacity="0.18"
          strokeWidth="1"
        />
      </Box>

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
          Any asset
          <br />
          <Box component="span" sx={{ color: 'primary.main' }}>
            to any asset.
          </Box>
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
          A direct, liquid market between any two assets. Choose what you send,
          what arrives, and where it lands. No account, no exchange, no hoops in
          between.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ mt: { xs: 4, md: 5 } }}
        >
          <Button
            component={RouterLink}
            to="/market"
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
            Open the market
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

      {/* Bottom-right mono sign-off, echoing the brand header art. */}
      <Typography
        sx={{
          position: 'absolute',
          right: { xs: 16, md: 48 },
          bottom: { xs: 12, md: 24 },
          display: { xs: 'none', sm: 'block' },
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          color: 'text.disabled',
        }}
      >
        Universal transaction layer
      </Typography>
    </Box>
  );
};

export default Hero;
