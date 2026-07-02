import React, { Suspense, useState } from 'react';
import { Box, Drawer, IconButton, Stack, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Outlet } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LoadingPage from '../pages/LoadingPage';
import { useThemeMode } from '../ThemeContext';
import { GateAccountProvider } from './account/GateAccountContext';
import GateSidebar from './GateSidebar';
import ConnectWalletButton from './wallet/ConnectWalletButton';

const iconBtnSx = {
  color: 'text.secondary',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 0,
  p: 0.6,
  '&:hover': {
    backgroundColor: 'action.hover',
    color: 'primary.main',
    borderColor: 'primary.main',
  },
} as const;

const GateAppLayout: React.FC = () => {
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <GateAccountProvider>
      <Stack
        direction="row"
        sx={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
      >
        {!isMobile && <GateSidebar />}

        {isMobile && (
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{ sx: { borderRadius: 0, backgroundImage: 'none' } }}
          >
            <GateSidebar onNavigate={() => setDrawerOpen(false)} />
          </Drawer>
        )}

        <Stack sx={{ flex: 1, minWidth: 0, height: '100%' }}>
          {/* Identity bar */}
          <Stack
            direction="row"
            alignItems="center"
            sx={{
              height: 60,
              px: { xs: 1.5, md: 2.5 },
              borderBottom: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              flexShrink: 0,
            }}
          >
            {isMobile && (
              <IconButton
                onClick={() => setDrawerOpen(true)}
                sx={{ ...iconBtnSx, mr: 1.5 }}
              >
                <MenuIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }} />
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <IconButton
                onClick={toggleTheme}
                sx={iconBtnSx}
                aria-label="toggle theme"
              >
                {mode === 'dark' ? (
                  <LightModeIcon sx={{ fontSize: 18 }} />
                ) : (
                  <DarkModeIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
              <ConnectWalletButton />
            </Stack>
          </Stack>

          {/* Routed content */}
          <Box
            component="main"
            sx={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              backgroundColor: 'background.default',
            }}
          >
            <Suspense fallback={<LoadingPage />}>
              <Outlet />
            </Suspense>
          </Box>
        </Stack>
      </Stack>
    </GateAccountProvider>
  );
};

export default GateAppLayout;
