import React from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  ButtonBase,
  Divider,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  onNavigate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const navItems = [
    { label: 'home', path: '/' },
  ];

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        px: 3,
        py: 4,
      }}
    >
      {/* Logo */}
      <ButtonBase
        disableRipple
        onClick={() => handleNavigate('/')}
        sx={{
          mb: 3,
          justifyContent: 'center',
          width: '100%',
          py: 1,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          ALLWAYS
        </Typography>
      </ButtonBase>

      {/* Navigation */}
      <Stack direction="column" spacing={2}>
        {navItems.map((item) => (
          <Button
            key={item.path}
            onClick={() => handleNavigate(item.path)}
            sx={{
              justifyContent: 'flex-start',
              py: 1.5,
              px: 2,
              color: '#ffffff',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.95rem',
              textTransform: 'none',
              backgroundColor:
                location.pathname === item.path
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'transparent',
              borderLeft:
                location.pathname === item.path
                  ? '2px solid #ffffff'
                  : '2px solid transparent',
              borderRadius: 0,
              textAlign: 'left',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'primary.main',
              },
            }}
          >
            {item.label}
          </Button>
        ))}
      </Stack>

      {/* Spacer */}
      <Box sx={{ flexGrow: 1 }} />

      {/* Footer */}
      <Box sx={{ mt: 2 }}>
        <Divider sx={{ borderColor: '#3d3d3d', mb: 2 }} />
        <Stack direction="column" spacing={1} alignItems="center">
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.6rem',
              color: '#888888',
            }}
          >
            © Allways 2026
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default Sidebar;
