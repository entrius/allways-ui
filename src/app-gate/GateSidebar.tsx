import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { NavLink, Link as RouterLink } from 'react-router-dom';
import { FONTS } from '../theme';
import { BrandMark } from '../components';
import { useGateAccount } from './account/GateAccountContext';
import { GATE_NAV } from './gateNav';

const itemSx = (active: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  px: 2,
  py: 1.1,
  textDecoration: 'none',
  color: active ? 'primary.main' : 'text.secondary',
  borderLeft: '2px solid',
  borderColor: active ? 'primary.main' : 'transparent',
  backgroundColor: active ? 'action.hover' : 'transparent',
  transition: 'color 120ms, background-color 120ms, border-color 120ms',
  '&:hover': { color: 'primary.main', backgroundColor: 'action.hover' },
});

const GateSidebar: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { isMember } = useGateAccount();

  return (
    <Stack
      sx={{
        width: 240,
        flexShrink: 0,
        height: '100%',
        borderRight: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      {/* Brand */}
      <Box
        component={RouterLink}
        to="/app"
        onClick={onNavigate}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          height: 60,
          borderBottom: '1px solid',
          borderColor: 'divider',
          textDecoration: 'none',
          color: 'text.primary',
        }}
      >
        <BrandMark size={22} />
        <Stack sx={{ lineHeight: 1 }}>
          <Typography
            sx={{
              fontFamily: FONTS.heading,
              fontWeight: 800,
              fontSize: '0.95rem',
              lineHeight: 1,
            }}
          >
            Allways
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.6rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'primary.main',
            }}
          >
            Access
          </Typography>
        </Stack>
      </Box>

      {/* Nav */}
      <Stack sx={{ flex: 1, py: 1.5, gap: 0.25 }}>
        {GATE_NAV.map(({ label, to, icon: Icon, gated, comingSoon }) => {
          const locked = gated && !isMember;
          return (
            <Box
              key={to}
              component={NavLink}
              to={to}
              onClick={onNavigate}
              sx={{ ...itemSx(false), '&.active': itemSx(true) }}
            >
              <Icon sx={{ fontSize: 19 }} />
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.78rem',
                  letterSpacing: '0.04em',
                  flex: 1,
                }}
              >
                {label}
              </Typography>
              {comingSoon ? (
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.55rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    border: '1px solid',
                    borderColor: 'divider',
                    px: 0.5,
                    py: 0.1,
                  }}
                >
                  Soon
                </Typography>
              ) : locked ? (
                <LockOutlinedIcon
                  sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.6 }}
                />
              ) : null}
            </Box>
          );
        })}
      </Stack>

      {/* Footer link back to the public site */}
      <Box
        component={RouterLink}
        to="/"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 2,
          py: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          textDecoration: 'none',
          color: 'text.secondary',
          fontFamily: FONTS.mono,
          fontSize: '0.68rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          '&:hover': { color: 'primary.main' },
        }}
      >
        <OpenInNewIcon sx={{ fontSize: 13 }} /> Main site
      </Box>
    </Stack>
  );
};

export default GateSidebar;
