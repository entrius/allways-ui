import React, { useState } from 'react';
import { Button } from '@mui/material';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import { FONTS } from '../../theme';
import { useGateAccount } from '../account/GateAccountContext';
import WalletAccountMenu from './WalletAccountMenu';
import WalletConnectDialog from './WalletConnectDialog';

const ConnectWalletButton: React.FC<{
  size?: 'small' | 'medium' | 'large';
}> = ({ size = 'small' }) => {
  const { isConnected } = useGateAccount();
  const [open, setOpen] = useState(false);

  if (isConnected) return <WalletAccountMenu />;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="contained"
        size={size}
        startIcon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 18 }} />}
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.74rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          boxShadow: 'none',
        }}
      >
        Connect Wallet
      </Button>
      <WalletConnectDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default ConnectWalletButton;
