import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { FONTS } from '../../theme';
import { useBestMiner, useChains } from '../../api/SwapApi';
import { formatRate } from '../../utils/format';
import TokenInput from './TokenInput';
import { useWallet } from '../../wallet/WalletProvider';
import type { BestMinerResponse } from '../../api/SwapApiClient';

export interface SwapFormSubmit {
  fromChain: string;
  toChain: string;
  /** Smallest-unit amount the user is sending. */
  fromAmount: number;
  /** Smallest-unit amount the user expects to receive (gross, before 1% fee). */
  toAmount: number;
  taoAmount: number;
  fromAddress: string;
  toAddress: string;
  best: BestMinerResponse;
  blockAnchor: number;
}

interface ChainSpec {
  id: string;
  decimals: number;
  symbol: string;
}

const STATIC_CHAINS: Record<string, ChainSpec> = {
  btc: { id: 'btc', decimals: 8, symbol: 'BTC' },
  tao: { id: 'tao', decimals: 9, symbol: 'TAO' },
};

const toSmallest = (human: string, decimals: number): number => {
  const n = parseFloat(human);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n * 10 ** decimals);
};

const fromSmallest = (n: number, decimals: number): string => {
  if (!Number.isFinite(n) || n <= 0) return '0.0';
  return (n / 10 ** decimals).toString();
};

interface Props {
  onSubmit: (input: SwapFormSubmit) => void;
  /** Set true when the parent has an in-flight swap and shouldn't accept new submits. */
  disabled?: boolean;
  onOpenConnect: (requireSubstrate: boolean) => void;
}

const SwapForm: React.FC<Props> = ({ onSubmit, disabled, onOpenConnect }) => {
  const { substrate, bitcoin } = useWallet();
  const chainsQuery = useChains();

  const supportedIds = useMemo(() => {
    if (chainsQuery.data?.chains?.length) {
      return chainsQuery.data.chains.map((c) => c.id);
    }
    return ['btc', 'tao'];
  }, [chainsQuery.data]);

  const [fromChain, setFromChain] = useState('btc');
  const [toChain, setToChain] = useState('tao');
  const [amountStr, setAmountStr] = useState('');
  const [toAddress, setToAddress] = useState('');

  // Keep `toChain` in sync if from changes.
  useEffect(() => {
    if (toChain === fromChain) {
      const other = supportedIds.find((id) => id !== fromChain);
      if (other) setToChain(other);
    }
  }, [fromChain, toChain, supportedIds]);

  const fromSpec = STATIC_CHAINS[fromChain] ?? STATIC_CHAINS.btc;
  const toSpec = STATIC_CHAINS[toChain] ?? STATIC_CHAINS.tao;

  const fromAmount = toSmallest(amountStr, fromSpec.decimals);
  const best = useBestMiner(fromChain, toChain, fromAmount, fromAmount > 0);

  const expectedHuman = useMemo(() => {
    if (!best.data) return '';
    return fromSmallest(best.data.expectedOut, toSpec.decimals);
  }, [best.data, toSpec.decimals]);

  const fromAddress =
    fromChain === 'btc' ? (bitcoin?.address ?? '') : (substrate?.address ?? '');
  const autoToAddress =
    toChain === 'btc' ? (bitcoin?.address ?? '') : (substrate?.address ?? '');

  // Default destination to the user's connected dest-chain wallet when present.
  useEffect(() => {
    if (!toAddress && autoToAddress) setToAddress(autoToAddress);
  }, [autoToAddress, toAddress]);

  const sourceConnected = fromChain === 'btc' ? !!bitcoin : !!substrate;

  const submitLabel = (() => {
    if (!sourceConnected) {
      return `Connect ${fromSpec.symbol} wallet`;
    }
    if (!toAddress) return 'Enter destination address';
    if (!amountStr || fromAmount <= 0) return 'Enter amount';
    if (best.isFetching && !best.data) return 'Fetching quote…';
    if (best.isError) return 'No miner available';
    if (!best.data) return 'Quote unavailable';
    return 'Review & Reserve';
  })();

  const canSubmit =
    sourceConnected &&
    !!toAddress &&
    fromAmount > 0 &&
    !!best.data &&
    !disabled;

  const handleSubmit = () => {
    if (!sourceConnected) {
      onOpenConnect(fromChain === 'tao');
      return;
    }
    if (!canSubmit || !best.data) return;

    // tao_amount is always the TAO side in rao regardless of direction (project invariant).
    const taoAmount = fromChain === 'tao' ? fromAmount : best.data.expectedOut; // BTC→TAO: expectedOut is TAO (gross, pre-fee)

    onSubmit({
      fromChain,
      toChain,
      fromAmount,
      toAmount: best.data.expectedOut,
      taoAmount,
      fromAddress,
      toAddress,
      best: best.data,
      blockAnchor: best.data.freshAsOf,
    });
  };

  const flipChains = () => {
    const f = fromChain;
    setFromChain(toChain);
    setToChain(f);
    setAmountStr('');
    setToAddress('');
  };

  return (
    <Stack
      sx={{
        p: { xs: 2, md: 3 },
        gap: 1.25,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'surface.light',
      }}
    >
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          mb: 0.5,
        }}
      >
        Exchange
      </Typography>

      <TokenInput
        label="From"
        symbol={fromSpec.symbol}
        balance="—"
        amount={amountStr || '0.0'}
        readOnly={false}
        onAmountChange={setAmountStr}
        symbolOptions={supportedIds.map(
          (id) => STATIC_CHAINS[id]?.symbol ?? id.toUpperCase(),
        )}
        onSymbolChange={(sym) => {
          const id = supportedIds.find(
            (cid) => (STATIC_CHAINS[cid]?.symbol ?? cid.toUpperCase()) === sym,
          );
          if (id) setFromChain(id);
        }}
      />

      <Box
        onClick={flipChains}
        sx={{
          alignSelf: 'center',
          p: 0.75,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.default',
          my: -1,
          zIndex: 1,
          cursor: 'pointer',
          '&:hover': { borderColor: 'primary.main' },
        }}
      >
        <ArrowDownwardIcon sx={{ fontSize: 16 }} />
      </Box>

      <TokenInput
        label="To (estimated)"
        symbol={toSpec.symbol}
        balance="—"
        amount={expectedHuman || '0.0'}
        readOnly
        symbolOptions={supportedIds.map(
          (id) => STATIC_CHAINS[id]?.symbol ?? id.toUpperCase(),
        )}
        onSymbolChange={(sym) => {
          const id = supportedIds.find(
            (cid) => (STATIC_CHAINS[cid]?.symbol ?? cid.toUpperCase()) === sym,
          );
          if (id) setToChain(id);
        }}
      />

      <TextField
        label={`${toSpec.symbol} destination address`}
        value={toAddress}
        onChange={(e) => setToAddress(e.target.value)}
        size="small"
        fullWidth
        sx={{
          mt: 1,
          '& .MuiInputBase-input': {
            fontFamily: FONTS.mono,
            fontSize: '0.8rem',
          },
        }}
        InputLabelProps={{
          sx: { fontFamily: FONTS.mono, fontSize: '0.75rem' },
        }}
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
          {best.data
            ? `${formatRate(best.data.rate)} ${toSpec.symbol} / ${fromSpec.symbol}`
            : `— ${toSpec.symbol} / ${fromSpec.symbol}`}
        </Typography>
      </Stack>

      {best.isError && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          No miner is currently quoting {fromSpec.symbol} → {toSpec.symbol}.
        </Alert>
      )}

      <Button
        fullWidth
        size="large"
        variant="contained"
        disabled={!canSubmit && sourceConnected}
        onClick={handleSubmit}
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.85rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          py: 1.5,
          boxShadow: 'none',
          borderRadius: 0,
          mt: 1,
        }}
      >
        {submitLabel}
      </Button>
    </Stack>
  );
};

export default SwapForm;
