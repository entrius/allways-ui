import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { FONTS } from '../../theme';
import { CopyableAddress } from '../../components';
import { useGateAccount } from '../account/GateAccountContext';
import { tierConfig, type Tier } from '../account/types';
import { DEPOSIT_ADDRESS } from '../account/fixtures';

type Phase = 'instructions' | 'watching' | 'done';

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.68rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {label}
    </Typography>
    <Box>{children}</Box>
  </Stack>
);

const SubscribeDialog: React.FC<{
  open: boolean;
  tier: Tier | null;
  onClose: () => void;
}> = ({ open, tier, onClose }) => {
  const { activateMembership } = useGateAccount();
  const [phase, setPhase] = useState<Phase>('instructions');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) setPhase('instructions');
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open]);

  if (!tier) return null;
  const cfg = tierConfig(tier);

  const simulatePayment = () => {
    setPhase('watching');
    // Stand-in for the off-chain deposit watcher confirming the payment.
    timer.current = setTimeout(() => {
      activateMembership(tier);
      setPhase('done');
    }, 1800);
  };

  return (
    <Dialog
      open={open}
      onClose={phase === 'watching' ? undefined : onClose}
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
        <Box>
          <Typography variant="eyebrow">Subscribe · {cfg.name}</Typography>
          <Typography
            sx={{
              fontFamily: FONTS.heading,
              fontWeight: 700,
              fontSize: '1.15rem',
            }}
          >
            {phase === 'done' ? 'You’re in.' : 'Pay with TAO'}
          </Typography>
        </Box>

        {phase === 'instructions' && (
          <>
            <Typography
              sx={{
                fontFamily: FONTS.body,
                fontSize: '0.88rem',
                color: 'text.secondary',
              }}
            >
              Send the membership fee to the validator deposit address. Our
              watcher activates your account as soon as the deposit confirms.
            </Typography>
            <Stack>
              <Row label="Plan">
                <Typography sx={{ fontFamily: FONTS.mono, fontSize: '0.8rem' }}>
                  {cfg.name}
                </Typography>
              </Row>
              <Row label="Amount">
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  {cfg.priceTao} TAO
                </Typography>
              </Row>
              <Row label="Deposit to">
                <CopyableAddress address={DEPOSIT_ADDRESS} fontSize="0.78rem" />
              </Row>
            </Stack>
            <Button
              fullWidth
              variant="contained"
              onClick={simulatePayment}
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.78rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                py: 1.25,
                boxShadow: 'none',
              }}
            >
              Simulate payment received
            </Button>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.62rem',
                color: 'text.secondary',
                textAlign: 'center',
              }}
            >
              Mock — no funds move in this demo.
            </Typography>
          </>
        )}

        {phase === 'watching' && (
          <Stack alignItems="center" sx={{ py: 4, gap: 1.5 }}>
            <CircularProgress size={24} />
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.72rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              Waiting for deposit…
            </Typography>
          </Stack>
        )}

        {phase === 'done' && (
          <Stack
            alignItems="center"
            sx={{ py: 3, gap: 1.5, textAlign: 'center' }}
          >
            <CheckCircleOutlineIcon
              sx={{ fontSize: 44, color: 'success.main' }}
            />
            <Typography
              sx={{
                fontFamily: FONTS.body,
                fontSize: '0.9rem',
                color: 'text.secondary',
              }}
            >
              {cfg.name} membership is active. Your coldkey is now whitelisted
              for reservations through this validator.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              onClick={onClose}
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.78rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                py: 1.25,
                boxShadow: 'none',
                mt: 1,
              }}
            >
              Go to dashboard
            </Button>
          </Stack>
        )}
      </Stack>
    </Dialog>
  );
};

export default SubscribeDialog;
