import React from 'react';
import { Grid, Stack, Typography } from '@mui/material';
import {
  EventFeed,
  MinerRatesTable,
  OrderbookDepth,
  ReservationsTracker,
  SwapTracker,
  Page,
  SEO,
} from '../components';
import { FONTS } from '../theme';

const DashboardPage: React.FC = () => {
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
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            mb: 2,
          }}
        >
          Network Activity
        </Typography>

        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          <Grid item xs={12}>
            <Stack
              sx={{
                p: { xs: 1.5, sm: 2, md: 2.5 },
                maxHeight: { xs: 'none', md: 480 },
                borderRadius: 0,
                backgroundColor: 'surface.light',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <ReservationsTracker />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Stack
              sx={{
                p: { xs: 1.5, sm: 2, md: 2.5 },
                height: { xs: 'auto', md: 520 },
                borderRadius: 0,
                backgroundColor: 'surface.light',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <MinerRatesTable />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Stack
              sx={{
                p: { xs: 1.5, sm: 2, md: 2.5 },
                height: { xs: 'auto', md: 520 },
                borderRadius: 0,
                backgroundColor: 'surface.light',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <OrderbookDepth />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={5} md={4}>
            <Stack
              sx={{
                p: { xs: 1.5, sm: 2, md: 2.5 },
                height: { xs: 'auto', md: 600 },
                borderRadius: 0,
                backgroundColor: 'surface.light',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <EventFeed />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={7} md={8}>
            <Stack
              sx={{
                p: { xs: 1.5, sm: 2, md: 2.5 },
                height: { xs: 'auto', md: 600 },
                borderRadius: 0,
                backgroundColor: 'surface.light',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <SwapTracker />
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Page>
  );
};

export default DashboardPage;
