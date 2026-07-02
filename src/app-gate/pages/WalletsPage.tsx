import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FONTS } from '../../theme';
import { SEO, CopyableAddress } from '../../components';
import { useGateAccount } from '../account/GateAccountContext';
import type { WalletChain } from '../account/types';
import { GatePage } from '../ui';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 0,
    fontFamily: FONTS.mono,
    fontSize: '0.82rem',
  },
  '& .MuiInputLabel-root': { fontFamily: FONTS.mono, fontSize: '0.8rem' },
};

const AddWalletDialog: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { addWallet } = useGateAccount();
  const [label, setLabel] = useState('');
  const [chain, setChain] = useState<WalletChain>('BTC');
  const [address, setAddress] = useState('');

  const submit = () => {
    if (!address.trim()) return;
    addWallet({
      label: label.trim() || 'Wallet',
      chain,
      address: address.trim(),
    });
    setLabel('');
    setAddress('');
    setChain('BTC');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 0,
          border: '1px solid',
          borderColor: 'divider',
          backgroundImage: 'none',
        },
      }}
    >
      <Stack sx={{ p: 3, gap: 2 }}>
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontWeight: 700,
            fontSize: '1.1rem',
          }}
        >
          Add wallet
        </Typography>
        <TextField
          label="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          size="small"
          sx={fieldSx}
        />
        <TextField
          label="Chain"
          value={chain}
          onChange={(e) => setChain(e.target.value as WalletChain)}
          size="small"
          select
          sx={fieldSx}
        >
          <MenuItem value="BTC">BTC</MenuItem>
          <MenuItem value="TAO">TAO</MenuItem>
        </TextField>
        <TextField
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          size="small"
          sx={fieldSx}
        />
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button onClick={onClose} variant="text" sx={{ fontSize: '0.75rem' }}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            variant="contained"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              boxShadow: 'none',
            }}
          >
            Add
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  );
};

const WalletsPage: React.FC = () => {
  const { account, removeWallet } = useGateAccount();
  const [open, setOpen] = useState(false);
  const wallets = account?.wallets ?? [];

  return (
    <GatePage
      eyebrow="Account"
      title="Wallets"
      subtitle="Addresses linked to your account for swaps and payouts."
      actions={
        <Button
          onClick={() => setOpen(true)}
          variant="outlined"
          startIcon={<AddIcon sx={{ fontSize: 17 }} />}
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.74rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Add wallet
        </Button>
      }
    >
      <SEO
        title="Wallets"
        description="Wallets linked to your Allways Access account."
      />

      <Stack spacing={1.5}>
        {wallets.map((w) => (
          <Box
            key={w.address}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                px: 0.75,
                py: 0.4,
                border: '1px solid',
                borderColor: 'divider',
                color: w.chain === 'BTC' ? 'asset.btc' : 'text.primary',
              }}
            >
              {w.chain}
            </Typography>
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography
                  sx={{
                    fontFamily: FONTS.body,
                    fontWeight: 600,
                    fontSize: '0.88rem',
                  }}
                >
                  {w.label}
                </Typography>
                {w.isPrimary && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.55rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'primary.main',
                      border: '1px solid',
                      borderColor: 'primary.main',
                      px: 0.5,
                    }}
                  >
                    Primary
                  </Typography>
                )}
              </Stack>
              <CopyableAddress address={w.address} fontSize="0.74rem" />
            </Stack>
            {!w.isPrimary && (
              <Button
                onClick={() => removeWallet(w.address)}
                sx={{
                  minWidth: 0,
                  color: 'text.secondary',
                  '&:hover': { color: 'error.main' },
                }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 18 }} />
              </Button>
            )}
          </Box>
        ))}
      </Stack>

      <AddWalletDialog open={open} onClose={() => setOpen(false)} />
    </GatePage>
  );
};

export default WalletsPage;
