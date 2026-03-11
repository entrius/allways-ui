import React from 'react';
import { Box, Stack, Typography, Link } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import { COLORS, FONTS } from '../../theme';

const Navbar: React.FC = () => (
  <Box
    component="nav"
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      px: { xs: 3, md: 5 },
      py: 2.5,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backdropFilter: 'blur(12px)',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderBottom: `1px solid ${COLORS.border}`,
    }}
  >
    {/* Logo */}
    <Typography
      sx={{
        fontFamily: FONTS.heading,
        fontWeight: 900,
        fontSize: { xs: '1rem', md: '1.1rem' },
        letterSpacing: '-0.02em',
        color: COLORS.white,
        textTransform: 'uppercase',
        cursor: 'default',
      }}
    >
      Allways
    </Typography>

    {/* Nav Links */}
    <Stack direction="row" spacing={{ xs: 2, md: 4 }} alignItems="center">
      <Link
        href="https://github.com/entrius"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          color: COLORS.textSecondary,
          transition: 'color 0.2s ease',
          display: 'flex',
          '&:hover': { color: COLORS.white },
        }}
      >
        <GitHubIcon sx={{ fontSize: { xs: '1rem', md: '1.2rem' } }} />
      </Link>
      <NavLink href="/dashboard" label="Dashboard" />
      <NavLink
        href="https://taostats.io/subnets/7"
        label="Tao Stats"
        external
      />
      <NavLink
        href="https://www.tao.app/subnets/7"
        label="Tao.app"
        external
      />
    </Stack>
  </Box>
);

const NavLink: React.FC<{
  href: string;
  label: string;
  external?: boolean;
}> = ({ href, label, external }) => (
  <Link
    href={href}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
    underline="none"
    sx={{
      fontFamily: FONTS.mono,
      fontSize: { xs: '0.7rem', md: '0.8rem' },
      color: COLORS.textSecondary,
      letterSpacing: '0.02em',
      transition: 'color 0.2s ease',
      '&:hover': {
        color: COLORS.white,
      },
    }}
  >
    {label}
  </Link>
);

export default Navbar;
