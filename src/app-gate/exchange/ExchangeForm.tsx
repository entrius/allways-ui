import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Link as RouterLink } from 'react-router-dom';
import { FONTS } from '../../theme';
import { useGateAccount } from '../account/GateAccountContext';
import type { SwapDirection, SwapRecord } from '../account/types';

// Mock orderbook rate (TAO per BTC). A real build would quote this live.
const MOCK_RATE = 27400;
const FEE_PCT = 1; // protocol fee, display only

type Phase = 'idle' | 'reserving' | 'done';

const AssetRow: React.FC<{
  label: string;
  symbol: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}> = ({ label, symbol, value, onChange, readOnly }) => (
  <Stack sx={{ p: 2, border: '1px solid', borderColor: 'divider', gap: 1 }}>
    <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <TextField
        value={value}
        onChange={(e) => onChange?.(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="0.0"
        variant="standard"
        InputProps={{
          disableUnderline: true,
          readOnly,
          sx: { fontFamily: FONTS.mono, fontSize: '1.6rem', fontWeight: 600 },
        }}
        sx={{ flex: 1 }}
      />
      <Box
        sx={{ px: 1.25, py: 0.75, border: '1px solid', borderColor: 'divider' }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '0.05em',
          }}
        >
          {symbol}
        </Typography>
      </Box>
    </Stack>
  </Stack>
);

const ExchangeForm: React.FC = () => {
  const { recordSwap } = useGateAccount();
  const [direction, setDirection] = useState<SwapDirection>('BTC_TO_TAO');
  const [amount, setAmount] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [lastSwap, setLastSwap] = useState<SwapRecord | null>(null);

  const btcToTao = direction === 'BTC_TO_TAO';
  const sourceSym = btcToTao ? 'BTC' : 'TAO';
  const destSym = btcToTao ? 'TAO' : 'BTC';

  const numeric = parseFloat(amount) || 0;
  const destValue = btcToTao ? numeric * MOCK_RATE : numeric / MOCK_RATE;
  const destDisplay = numeric ? destValue.toFixed(btcToTao ? 2 : 5) : '0.0';

  const flip = () => {
    setDirection((d) => (d === 'BTC_TO_TAO' ? 'TAO_TO_BTC' : 'BTC_TO_TAO'));
    setAmount('');
  };

  const reserve = () => {
    if (!numeric) return;
    setPhase('reserving');
    // Stand-in for: validator authorizes the reservation → miner fulfills.
    setTimeout(() => {
      const record: SwapRecord = {
        id: `swap-${Date.now()}`,
        direction,
        sourceAmount: numeric.toFixed(btcToTao ? 4 : 1),
        destAmount: destValue.toFixed(btcToTao ? 2 : 5),
        rate: String(MOCK_RATE),
        status: 'completed',
        createdAt: Date.now(),
      };
      recordSwap(record);
      setLastSwap(record);
      setPhase('done');
      setAmount('');
    }, 1400);
  };

  if (phase === 'done' && lastSwap) {
    return (
      <Stack
        alignItems="center"
        sx={{
          p: 4,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          gap: 1.5,
          textAlign: 'center',
        }}
      >
        <CheckCircleOutlineIcon sx={{ fontSize: 46, color: 'success.main' }} />
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontWeight: 700,
            fontSize: '1.15rem',
          }}
        >
          Swap complete
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.85rem',
            color: 'text.secondary',
          }}
        >
          {lastSwap.sourceAmount} {btcToTao ? 'BTC' : 'TAO'} →{' '}
          {lastSwap.destAmount} {btcToTao ? 'TAO' : 'BTC'}
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
          <Button
            onClick={() => setPhase('idle')}
            variant="outlined"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.74rem',
              textTransform: 'uppercase',
            }}
          >
            New swap
          </Button>
          <Button
            component={RouterLink}
            to="/app/swaps"
            variant="contained"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.74rem',
              textTransform: 'uppercase',
              boxShadow: 'none',
            }}
          >
            View history
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack
      sx={{
        p: { xs: 2, md: 3 },
        gap: 1.25,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <AssetRow
        label="You send"
        symbol={sourceSym}
        value={amount}
        onChange={setAmount}
      />

      <Box
        onClick={flip}
        sx={{
          alignSelf: 'center',
          p: 0.75,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.default',
          my: -1,
          zIndex: 1,
          cursor: 'pointer',
          '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
        }}
      >
        <SwapVertIcon sx={{ fontSize: 16, display: 'block' }} />
      </Box>

      <AssetRow
        label="You receive"
        symbol={destSym}
        value={destDisplay}
        readOnly
      />

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            color: 'text.secondary',
          }}
        >
          Rate
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            color: 'text.secondary',
          }}
        >
          {MOCK_RATE.toLocaleString()} TAO / BTC
        </Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            color: 'text.secondary',
          }}
        >
          Protocol fee
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            color: 'text.secondary',
          }}
        >
          {FEE_PCT}%
        </Typography>
      </Stack>

      <Button
        fullWidth
        size="large"
        variant="contained"
        disabled={!numeric || phase === 'reserving'}
        onClick={reserve}
        startIcon={
          phase === 'reserving' ? (
            <CircularProgress size={16} color="inherit" />
          ) : undefined
        }
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.85rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          py: 1.5,
          boxShadow: 'none',
          mt: 1,
        }}
      >
        {phase === 'reserving' ? 'Reserving miner…' : 'Reserve & swap'}
      </Button>
    </Stack>
  );
};

export default ExchangeForm;
