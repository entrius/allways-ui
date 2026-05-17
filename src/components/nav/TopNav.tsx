import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { NavLink, useLocation } from 'react-router-dom';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import MenuIcon from '@mui/icons-material/Menu';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { FONTS } from '../../theme';
import { useThemeMode } from '../../ThemeContext';
import BrandMark from '../BrandMark';
import SocialLinks from './SocialLinks';
import { NAV_ITEMS, docsUrl } from './links';

const navBtnSx = (active: boolean) => ({
  fontFamily: FONTS.mono,
  fontSize: '0.75rem',
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: active ? 'primary.main' : 'text.secondary',
  textDecoration: 'none',
  py: 0.75,
  px: 0.25,
  borderBottom: '1px solid',
  borderColor: active ? 'primary.main' : 'transparent',
  transition: 'color 120ms, border-color 120ms',
  '&:hover': {
    color: 'primary.main',
  },
});

const iconBtnSx = {
  color: 'text.secondary',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 0,
  p: 0.75,
  '&:hover': {
    backgroundColor: 'action.hover',
    color: 'primary.main',
    borderColor: 'primary.main',
  },
} as const;

const TopNav: React.FC = () => {
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const docs = docsUrl();

  const isActive = (to: string): boolean => {
    if (to === '/dashboard') {
      return (
        location.pathname === '/dashboard' ||
        location.pathname.startsWith('/swap/')
      );
    }
    if (to === '/miners') {
      return location.pathname.startsWith('/miners');
    }
    return location.pathname === to;
  };

  return (
    <Stack
      component="header"
      direction="row"
      alignItems="center"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: theme.zIndex.appBar,
        flexShrink: 0,
        flexGrow: 0,
        height: { xs: 52, md: 56 },
        minHeight: { xs: 52, md: 56 },
        maxHeight: { xs: 52, md: 56 },
        boxSizing: 'border-box',
        px: { xs: 1.5, sm: 2, md: 4 },
        backgroundColor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Stack
        component={NavLink}
        to="/"
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ textDecoration: 'none', color: 'text.primary' }}
      >
        <BrandMark size={24} />
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontWeight: 900,
            fontSize: '0.95rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: { xs: 'none', sm: 'inline' },
          }}
        >
          Allways
        </Typography>
      </Stack>

      <Box sx={{ flex: 1 }} />

      {!isMobile && (
        <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mr: 2 }}>
          {NAV_ITEMS.map((item) => (
            <Box
              key={item.label}
              component={NavLink}
              to={item.to ?? '#'}
              sx={navBtnSx(isActive(item.to ?? ''))}
            >
              {item.label}
            </Box>
          ))}
          <Box
            component="a"
            href={docs}
            target="_blank"
            rel="noopener noreferrer"
            sx={navBtnSx(false)}
          >
            Docs
            <OpenInNewIcon
              sx={{ fontSize: 12, ml: 0.5, verticalAlign: 'middle' }}
            />
          </Box>
        </Stack>
      )}

      {!isMobile && (
        <Stack direction="row" spacing={1} alignItems="center">
          <SocialLinks size={16} spacing={0.75} />
          <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'} arrow>
            <IconButton onClick={toggleTheme} sx={iconBtnSx}>
              {mode === 'light' ? (
                <DarkModeIcon sx={{ fontSize: 16 }} />
              ) : (
                <LightModeIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Tooltip>
        </Stack>
      )}

      {isMobile && (
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={toggleTheme} sx={iconBtnSx}>
            {mode === 'light' ? (
              <DarkModeIcon sx={{ fontSize: 16 }} />
            ) : (
              <LightModeIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
          <IconButton
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={iconBtnSx}
          >
            <MenuIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            PaperProps={{
              sx: {
                borderRadius: 0,
                border: '1px solid',
                borderColor: 'divider',
                mt: 1,
                minWidth: 180,
              },
            }}
            MenuListProps={{ sx: { py: 0 } }}
          >
            {NAV_ITEMS.map((item) => (
              <MenuItem
                key={item.label}
                component={NavLink}
                to={item.to ?? '#'}
                onClick={() => setMenuAnchor(null)}
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {item.label}
              </MenuItem>
            ))}
            <MenuItem
              component="a"
              href={docs}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuAnchor(null)}
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              Docs
              <OpenInNewIcon sx={{ fontSize: 12, ml: 0.75 }} />
            </MenuItem>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <SocialLinks size={16} spacing={0.75} />
            </Box>
          </Menu>
        </Stack>
      )}
    </Stack>
  );
};

export default TopNav;
