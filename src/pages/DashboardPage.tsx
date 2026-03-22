import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useSSE } from '../hooks';
import EventFeed from '../components/dashboard/EventFeed';
import MinerRatesTable from '../components/dashboard/MinerRatesTable';
import SwapTracker from '../components/dashboard/SwapTracker';
import StatsPanel from '../components/dashboard/StatsPanel';
import { COLORS, FONTS } from '../theme';

const DashboardPage: React.FC = () => {
  useSSE();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: COLORS.bg,
        px: { xs: 2, md: 4 },
        py: { xs: 10, md: 12 },
        maxWidth: 1400,
        mx: 'auto',
      }}
    >
      <Typography
        sx={{
          fontFamily: FONTS.heading,
          fontWeight: 900,
          fontSize: { xs: '1.5rem', md: '2rem' },
          color: COLORS.white,
          mb: 3,
        }}
      >
        Dashboard
      </Typography>

      <Box sx={{ mb: 3 }}>
        <StatsPanel />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 1,
              backgroundColor: COLORS.surfaceLight,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <MinerRatesTable />
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 1,
              backgroundColor: COLORS.surfaceLight,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <EventFeed />
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 1,
              backgroundColor: COLORS.surfaceLight,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <SwapTracker />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
