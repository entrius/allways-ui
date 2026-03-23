import React from 'react';
import { Box, Grid, Typography, IconButton } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useSSE } from '../hooks';
import EventFeed from '../components/dashboard/EventFeed';
import MinerRatesTable from '../components/dashboard/MinerRatesTable';
import OrderbookDepth from '../components/dashboard/OrderbookDepth';
import SwapTracker from '../components/dashboard/SwapTracker';
import StatsPanel from '../components/dashboard/StatsPanel';
import { FONTS } from '../theme';
import { useThemeMode } from '../ThemeContext';
import logo from '../assets/logo.jpg';

const DashboardPage: React.FC = () => {
  useSSE();
  const { mode, toggleTheme } = useThemeMode();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        px: { xs: 2, md: 4 },
        py: { xs: 10, md: 12 },
        maxWidth: 1400,
        mx: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
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
        <Box sx={{ flex: 1 }} />
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
      </Box>

      <Box sx={{ mb: 3 }}>
        <StatsPanel />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 2.5,
              height: '100%',
              borderRadius: 0,
              backgroundColor: 'surface.light',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <MinerRatesTable />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 2.5,
              height: '100%',
              borderRadius: 0,
              backgroundColor: 'surface.light',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <OrderbookDepth />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              p: 2.5,
              height: '100%',
              borderRadius: 0,
              backgroundColor: 'surface.light',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <EventFeed />
          </Box>
        </Grid>
        <Grid item xs={12} md={8}>
          <Box
            sx={{
              p: 2.5,
              height: '100%',
              borderRadius: 0,
              backgroundColor: 'surface.light',
              border: '1px solid',
              borderColor: 'divider',
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
