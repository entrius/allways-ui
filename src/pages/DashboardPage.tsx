import React from 'react';
import {
  Box,
  Divider,
  Grid,
  Stack,
  Typography,
  keyframes,
  useTheme,
} from '@mui/material';
import {
  BlockIndicator,
  EventFeed,
  MinerRatesTable,
  OrderbookDepth,
  ReservationsTracker,
  StatsPanel,
  SwapTracker,
  Page,
  SEO,
} from '../components';
import { FONTS } from '../theme';

const livePulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.45; transform: scale(0.85); }
`;

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Mode-aware accents: dark mode uses calmer indigo + emerald with a soft glow;
  // light mode keeps the existing royal-blue / neon-green palette.
  const accentColor = isDark ? '#5b8def' : theme.palette.primary.main;
  const liveDotColor = isDark ? '#10b981' : '#22c55e';
  const liveDotGlow = isDark ? `0 0 8px ${liveDotColor}99` : 'none';
  const panelBg = isDark ? 'surface.elevated' : 'surface.light';

  const panelSx = {
    p: { xs: 1.5, sm: 2, md: 2.5 },
    borderRadius: 0,
    backgroundColor: panelBg,
    border: '1px solid',
    borderColor: 'divider',
    position: 'relative' as const,
    '&::before': {
      content: '""',
      position: 'absolute' as const,
      top: 0,
      left: 0,
      height: 2,
      width: 32,
      backgroundColor: accentColor,
    },
  };

  return (
    <Page>
      <SEO
        title="Dashboard"
        description="Live network activity for Allways — Bittensor SN7"
      />
      <Stack
        sx={{
          backgroundColor: 'background.default',
          px: { xs: 1.5, sm: 2, md: 4 },
          py: { xs: 2, sm: 3, md: 4 },
          width: '100%',
          maxWidth: 1400,
          mx: 'auto',
        }}
      >
        {/* ── Hero ─────────────────────────────────────────────── */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          justifyContent="space-between"
          sx={{ gap: { xs: 1.5, sm: 2 }, mb: { xs: 2, md: 3 } }}
        >
          <Stack spacing={1}>
            <Typography
              variant="eyebrow"
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: accentColor,
              }}
            >
              Network Activity / SN7
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: FONTS.heading,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                color: 'text.primary',
              }}
            >
              Dashboard
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.body,
                fontSize: { xs: '0.85rem', sm: '0.9rem' },
                color: 'text.secondary',
                maxWidth: 560,
              }}
            >
              Real-time view of miner rates, orderbook depth, active
              reservations, and on-chain swap activity across the Allways
              network.
            </Typography>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: panelBg,
              px: 1.5,
              py: 0.75,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: liveDotColor,
                  boxShadow: liveDotGlow,
                  animation: `${livePulse} 1.6s ease-in-out infinite`,
                }}
              />
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.65rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                Live
              </Typography>
            </Stack>
            <Divider
              orientation="vertical"
              flexItem
              sx={{ borderColor: 'divider' }}
            />
            <BlockIndicator />
          </Stack>
        </Stack>

        <Divider sx={{ mb: { xs: 2, md: 3 }, borderColor: 'divider' }} />

        {/* ── KPI strip ────────────────────────────────────────── */}
        <Box sx={{ mb: { xs: 2, sm: 2.5, md: 3 } }}>
          <StatsPanel />
        </Box>

        {/* ── Main grid ───────────────────────────────────────── */}
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          <Grid item xs={12} sm={6}>
            <Stack sx={{ ...panelSx, height: { xs: 'auto', md: 520 } }}>
              <MinerRatesTable />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Stack sx={{ ...panelSx, height: { xs: 'auto', md: 520 } }}>
              <OrderbookDepth />
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Stack sx={panelSx}>
              <ReservationsTracker />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={5} md={4}>
            <Stack sx={{ ...panelSx, height: { xs: 'auto', md: 600 } }}>
              <EventFeed />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={7} md={8}>
            <Stack sx={{ ...panelSx, height: { xs: 'auto', md: 600 } }}>
              <SwapTracker />
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Page>
  );
};

export default DashboardPage;
