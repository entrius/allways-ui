import React from 'react';
import { Grid, Typography, IconButton, Stack, Tooltip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useSSE } from '../hooks';
import {
  EventFeed,
  MinerRatesTable,
  OrderbookDepth,
  SwapTracker,
  StatsPanel,
  Page,
  SEO,
} from '../components';
import { FONTS } from '../theme';
import { useThemeMode } from '../ThemeContext';
import logo from '../assets/logo.jpg';

const DashboardPage: React.FC = () => {
  useSSE();
  const { mode, toggleTheme } = useThemeMode();
  const docsUrl =
    window.location.hostname === 'all-ways.io'
      ? 'https://docs.all-ways.io/'
      : 'https://test-docs.all-ways.io/';

  return (
    <Page>
      <SEO
        title="Dashboard"
        description="Trustless cross-chain swaps on Bittensor Subnet 7"
      />
      <Stack
        sx={{
          minHeight: '100vh',
          backgroundColor: 'background.default',
          px: { xs: 1.5, sm: 2, md: 4 },
          py: { xs: 2, sm: 3, md: 4 },
          width: '100%',
          maxWidth: 1400,
          mx: 'auto',
        }}
      >
        <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
          <img
            src={logo}
            alt="Allways Logo"
            style={{
              height: '2.5rem',
              marginRight: '1rem',
              filter: mode === 'dark' ? 'invert(1)' : 'none',
              mixBlendMode: mode === 'dark' ? 'screen' : 'multiply',
            }}
          />
          <Typography
            sx={{
              fontFamily: FONTS.heading,
              fontWeight: 900,
              fontSize: { xs: '1.5rem', md: '2rem' },
              color: 'text.primary',
            }}
          >
            Dashboard
          </Typography>
          <Stack sx={{ flex: 1 }} />
          <Tooltip title="Documentation" arrow>
            <IconButton
              component="a"
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 0,
                p: 1,
                mr: 1,
                '&:hover': {
                  backgroundColor: 'action.hover',
                  color: 'primary.main',
                },
              }}
            >
              <MenuBookIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={toggleTheme}
            sx={{
              color: 'text.secondary',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 0,
              p: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            {mode === 'light' ? (
              <DarkModeIcon sx={{ fontSize: 20 }} />
            ) : (
              <LightModeIcon sx={{ fontSize: 20 }} />
            )}
          </IconButton>
        </Stack>

        <Stack sx={{ mb: 3 }}>
          <StatsPanel />
        </Stack>

        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          <Grid item xs={12} sm={6}>
            <Stack
              sx={{
                p: { xs: 1.5, sm: 2, md: 2.5 },
                height: '100%',
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
                height: '100%',
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
                height: '100%',
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
                height: '100%',
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
