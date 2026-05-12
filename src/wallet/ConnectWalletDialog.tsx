import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { FONTS } from '../theme';
import { useWallet } from './WalletProvider';
import { detectSubstrateExtensions } from './substrate';
import { detectBitcoinExtensions } from './bitcoin';

interface ConnectWalletDialogProps {
  open: boolean;
  onClose: () => void;
  /** Force the user to connect Substrate before closing (TAO-source swaps). */
  requireSubstrate?: boolean;
}

const KNOWN_SUBSTRATE: Record<string, string> = {
  'polkadot-js': 'Polkadot.js',
  talisman: 'Talisman',
  'subwallet-js': 'SubWallet',
};

const ConnectWalletDialog: React.FC<ConnectWalletDialogProps> = ({
  open,
  onClose,
  requireSubstrate = false,
}) => {
  const { substrate, bitcoin, connectSubstrateWallet, connectBitcoinWallet } =
    useWallet();
  const [substrateExtensions, setSubstrateExtensions] = useState<string[]>([]);
  const [unisatDetected, setUnisatDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSubstrateExtensions(detectSubstrateExtensions());
      setUnisatDetected(detectBitcoinExtensions().length > 0);
      setError(null);
    }
  }, [open]);

  const handleSubstrate = async () => {
    setBusy(true);
    setError(null);
    try {
      await connectSubstrateWallet();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleBitcoin = async () => {
    setBusy(true);
    setError(null);
    try {
      await connectBitcoinWallet();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const canClose = useMemo(() => {
    if (requireSubstrate) return !!substrate;
    return !!substrate || !!bitcoin;
  }, [requireSubstrate, substrate, bitcoin]);

  return (
    <Dialog
      open={open}
      onClose={canClose ? onClose : undefined}
      PaperProps={{
        sx: {
          borderRadius: 0,
          border: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: FONTS.heading,
          fontWeight: 700,
          fontSize: '1rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        Connect wallets
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3} sx={{ minWidth: { xs: 280, sm: 360 } }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Stack spacing={1}>
            <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
              Substrate (TAO)
            </Typography>
            {substrate ? (
              <Typography sx={{ fontFamily: FONTS.mono, fontSize: '0.8rem' }}>
                Connected: {substrate.address.slice(0, 8)}…
                {substrate.address.slice(-6)}
              </Typography>
            ) : substrateExtensions.length === 0 ? (
              <Typography
                sx={{
                  fontFamily: FONTS.body,
                  fontSize: '0.8rem',
                  color: 'text.secondary',
                }}
              >
                No Substrate extension detected. Install Polkadot.js, Talisman,
                or SubWallet.
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                <Typography
                  sx={{
                    fontFamily: FONTS.body,
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                  }}
                >
                  Detected:{' '}
                  {substrateExtensions
                    .map((s) => KNOWN_SUBSTRATE[s] ?? s)
                    .join(', ')}
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleSubstrate}
                  disabled={busy}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Connect Substrate
                </Button>
              </Stack>
            )}
          </Stack>

          <Stack spacing={1}>
            <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
              Bitcoin
            </Typography>
            {bitcoin ? (
              <Typography sx={{ fontFamily: FONTS.mono, fontSize: '0.8rem' }}>
                Connected: Unisat — {bitcoin.address.slice(0, 8)}…
                {bitcoin.address.slice(-6)}
              </Typography>
            ) : !unisatDetected ? (
              <Typography
                sx={{
                  fontFamily: FONTS.body,
                  fontSize: '0.8rem',
                  color: 'text.secondary',
                }}
              >
                Unisat extension not detected. Install Unisat to send BTC from
                your browser.
              </Typography>
            ) : (
              <Button
                variant="outlined"
                onClick={handleBitcoin}
                disabled={busy}
                sx={{ alignSelf: 'flex-start' }}
              >
                Connect Unisat
              </Button>
            )}
          </Stack>

          {requireSubstrate && !substrate && (
            <Alert severity="info">
              TAO-source swaps require a Substrate wallet. Connect one to
              continue.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={!canClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConnectWalletDialog;
