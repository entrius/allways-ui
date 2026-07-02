import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { FONTS } from '../../theme';
import { useGateAccount } from '../account/GateAccountContext';
import { shortAddress } from '../format';
import {
  connectExtensions,
  NoExtensionError,
  signChallenge,
  type WalletAccount,
} from './useWallet';

const WALLET_LINKS = [
  { name: 'Polkadot.js', url: 'https://polkadot.js.org/extension/' },
  { name: 'Talisman', url: 'https://talisman.xyz/' },
  { name: 'SubWallet', url: 'https://subwallet.app/' },
];

type Phase = 'loading' | 'pick' | 'signing' | 'no-extension' | 'error';

const labelSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.7rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
};

const WalletConnectDialog: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { connect } = useGateAccount();
  const [phase, setPhase] = useState<Phase>('loading');
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase('loading');
    setError('');
    connectExtensions()
      .then((accs) => {
        if (cancelled) return;
        setAccounts(accs);
        setPhase('pick');
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof NoExtensionError) setPhase('no-extension');
        else {
          setError(e?.message ?? 'Failed to connect');
          setPhase('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const pick = async (acct: WalletAccount) => {
    setPhase('signing');
    setError('');
    try {
      const signature = await signChallenge(acct.address);
      connect(acct, signature);
      onClose();
    } catch (e) {
      setError(
        (e as Error)?.message === 'Cancelled'
          ? 'Signature request was rejected.'
          : 'Could not get a signature. Try again.',
      );
      setPhase('pick');
    }
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
          backgroundColor: 'background.paper',
          backgroundImage: 'none',
        },
      }}
    >
      <Stack sx={{ p: 3, gap: 2 }}>
        <Box>
          <Typography variant="eyebrow">Connect</Typography>
          <Typography
            sx={{
              fontFamily: FONTS.heading,
              fontWeight: 700,
              fontSize: '1.15rem',
            }}
          >
            Connect your wallet
          </Typography>
        </Box>

        {phase === 'loading' && (
          <Stack alignItems="center" sx={{ py: 4, gap: 1.5 }}>
            <CircularProgress size={22} />
            <Typography sx={{ ...labelSx }}>Looking for extensions…</Typography>
          </Stack>
        )}

        {phase === 'signing' && (
          <Stack alignItems="center" sx={{ py: 4, gap: 1.5 }}>
            <CircularProgress size={22} />
            <Typography sx={{ ...labelSx }}>Awaiting signature…</Typography>
          </Stack>
        )}

        {phase === 'no-extension' && (
          <Stack sx={{ gap: 1.5 }}>
            <Typography
              sx={{
                fontFamily: FONTS.body,
                fontSize: '0.9rem',
                color: 'text.secondary',
              }}
            >
              No Substrate wallet detected. Install one, then reconnect:
            </Typography>
            <Stack sx={{ gap: 0.75 }}>
              {WALLET_LINKS.map((w) => (
                <Link
                  key={w.name}
                  href={w.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.85rem',
                    color: 'primary.main',
                  }}
                >
                  {w.name} →
                </Link>
              ))}
            </Stack>
          </Stack>
        )}

        {phase === 'error' && (
          <Typography
            sx={{
              fontFamily: FONTS.body,
              fontSize: '0.9rem',
              color: 'error.main',
            }}
          >
            {error || 'Something went wrong.'}
          </Typography>
        )}

        {phase === 'pick' && (
          <Stack sx={{ gap: 1 }}>
            {error && (
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.72rem',
                  color: 'error.main',
                }}
              >
                {error}
              </Typography>
            )}
            {accounts.length === 0 ? (
              <Typography
                sx={{
                  fontFamily: FONTS.body,
                  fontSize: '0.9rem',
                  color: 'text.secondary',
                }}
              >
                No accounts exposed. Authorize this site in your wallet, then
                reconnect.
              </Typography>
            ) : (
              accounts.map((a) => (
                <Box
                  key={a.address}
                  onClick={() => pick(a)}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    transition: 'border-color 120ms',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography
                      sx={{
                        fontFamily: FONTS.body,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                      }}
                    >
                      {a.name || 'Account'}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.62rem',
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                      }}
                    >
                      {a.source}
                    </Typography>
                  </Stack>
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.72rem',
                      color: 'text.secondary',
                    }}
                  >
                    {shortAddress(a.address)}
                  </Typography>
                </Box>
              ))
            )}
          </Stack>
        )}

        <Button
          onClick={onClose}
          variant="text"
          sx={{ alignSelf: 'flex-end', fontSize: '0.75rem' }}
        >
          Cancel
        </Button>
      </Stack>
    </Dialog>
  );
};

export default WalletConnectDialog;
