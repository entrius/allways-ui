import React, { useState } from 'react';
import { Box, Menu, MenuItem, Stack, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LogoutIcon from '@mui/icons-material/Logout';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { FONTS } from '../../theme';
import { useGateAccount } from '../account/GateAccountContext';
import { shortAddress } from '../format';

const WalletAccountMenu: React.FC = () => {
  const { connected, disconnect } = useGateAccount();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  if (!connected) return null;

  const close = () => setAnchor(null);

  return (
    <>
      <Box
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.6,
          border: '1px solid',
          borderColor: 'divider',
          cursor: 'pointer',
          transition: 'border-color 120ms',
          '&:hover': { borderColor: 'primary.main' },
        }}
      >
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: 'success.main',
          }}
        />
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.74rem',
            color: 'text.primary',
          }}
        >
          {shortAddress(connected.address)}
        </Typography>
        <KeyboardArrowDownIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
      </Box>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              border: '1px solid',
              borderColor: 'divider',
              minWidth: 200,
            },
          },
        }}
      >
        <Stack sx={{ px: 1.5, py: 1 }}>
          <Typography
            sx={{
              fontFamily: FONTS.body,
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            {connected.name || 'Account'}
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.66rem',
              color: 'text.secondary',
              textTransform: 'uppercase',
            }}
          >
            {connected.source}
          </Typography>
        </Stack>
        <MenuItem
          onClick={() => {
            navigator.clipboard.writeText(connected.address);
            close();
          }}
          sx={{ fontFamily: FONTS.mono, fontSize: '0.78rem', gap: 1 }}
        >
          <ContentCopyIcon sx={{ fontSize: 15 }} /> Copy address
        </MenuItem>
        <MenuItem
          onClick={() => {
            disconnect();
            close();
          }}
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.78rem',
            gap: 1,
            color: 'error.main',
          }}
        >
          <LogoutIcon sx={{ fontSize: 15 }} /> Disconnect
        </MenuItem>
      </Menu>
    </>
  );
};

export default WalletAccountMenu;
