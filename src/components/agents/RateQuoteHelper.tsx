import React, { useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { FONTS } from '../../theme';
import { useMiners } from '../../api';

type Direction = 'BTC->TAO' | 'TAO->BTC';

interface BestQuote {
  uid: number;
  hotkey: string;
  rate: string;
  out: string;
}

const computeBest = (
  miners: {
    rate: string | null;
    counterRate: string | null;
    uid: number;
    hotkey: string;
    isActive: boolean;
    sourceChain: string | null;
    destChain: string | null;
  }[],
  direction: Direction,
  amount: number,
): BestQuote | null => {
  const candidates = miners
    .filter((m) => m.isActive)
    .map((m) => {
      // Canonical order: TAO is destChain when present.
      // rate = source→dest, counterRate = dest→source.
      // For BTC->TAO: when sourceChain=BTC and destChain=TAO, use rate.
      // For TAO->BTC: when sourceChain=BTC and destChain=TAO, use counterRate.
      const isBtcTao = m.sourceChain === 'BTC' && m.destChain === 'TAO';
      if (!isBtcTao) return null;
      const r = direction === 'BTC->TAO' ? m.rate : m.counterRate;
      if (!r || parseFloat(r) <= 0) return null;
      return { uid: m.uid, hotkey: m.hotkey, rate: r };
    })
    .filter(
      (x): x is { uid: number; hotkey: string; rate: string } => x !== null,
    );

  if (candidates.length === 0) return null;
  // Best = highest output for the user.
  const best = candidates.reduce((a, b) =>
    parseFloat(a.rate) >= parseFloat(b.rate) ? a : b,
  );
  const out = (parseFloat(best.rate) * amount).toFixed(6);
  return { ...best, out };
};

interface CopyRowProps {
  label: string;
  value: string;
}

const CopyRow: React.FC<CopyRowProps> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Stack spacing={0.75}>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.65rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        {label}
      </Typography>
      <Stack
        direction="row"
        alignItems="center"
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.default',
        }}
      >
        <Box
          component="code"
          sx={{
            flex: 1,
            fontFamily: FONTS.mono,
            fontSize: '0.78rem',
            px: 1.5,
            py: 1,
            color: 'text.primary',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </Box>
        <Tooltip title={copied ? 'Copied' : 'Copy'} arrow>
          <IconButton
            onClick={onClick}
            sx={{
              borderRadius: 0,
              borderLeft: '1px solid',
              borderColor: 'divider',
              color: 'text.secondary',
              p: 1,
              '&:hover': { color: 'primary.main' },
            }}
          >
            {copied ? (
              <CheckIcon sx={{ fontSize: 16 }} />
            ) : (
              <ContentCopyIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
};

const RateQuoteHelper: React.FC = () => {
  const { data: miners } = useMiners();
  const [direction, setDirection] = useState<Direction>('BTC->TAO');
  const [amountStr, setAmountStr] = useState('0.01');
  const amount = parseFloat(amountStr) || 0;

  const best = useMemo(
    () => (miners ? computeBest(miners, direction, amount) : null),
    [miners, direction, amount],
  );

  const sourceSym = direction === 'BTC->TAO' ? 'BTC' : 'TAO';
  const destSym = direction === 'BTC->TAO' ? 'TAO' : 'BTC';

  const cliCmd = best
    ? `alw swap initiate --miner ${best.uid} --from ${sourceSym} --amount ${amount} --to-address <your-${destSym.toLowerCase()}-address>`
    : `# no active miner quoting ${sourceSym} -> ${destSym} right now`;

  const curlCmd = `curl -s ${typeof window !== 'undefined' ? window.location.origin : 'https://api.all-ways.io'}/miners | jq '.[] | select(.isActive and .sourceChain=="BTC" and .destChain=="TAO") | {uid, rate: ${direction === 'BTC->TAO' ? '.rate' : '.counterRate'}, hotkey}' | jq -s 'sort_by(-.rate | tonumber)[0]'`;

  return (
    <Stack
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 2.5, md: 3 },
        backgroundColor: 'surface.light',
        gap: 2,
      }}
    >
      <Stack spacing={0.5}>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'primary.main',
          }}
        >
          Live rate quote
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontWeight: 800,
            fontSize: { xs: '1.05rem', md: '1.15rem' },
            letterSpacing: '-0.01em',
          }}
        >
          Quote against the live orderbook.
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.body,
            fontSize: '0.85rem',
            color: 'text.secondary',
          }}
        >
          Picks the best active miner. Copy the CLI line and run it from any
          agent shell.
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          select
          label="Direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value as Direction)}
          size="small"
          sx={{ minWidth: 160 }}
          InputLabelProps={{
            sx: { fontFamily: FONTS.mono, fontSize: '0.75rem' },
          }}
          InputProps={{ sx: { fontFamily: FONTS.mono, borderRadius: 0 } }}
        >
          <MenuItem value="BTC->TAO">BTC → TAO</MenuItem>
          <MenuItem value="TAO->BTC">TAO → BTC</MenuItem>
        </TextField>
        <TextField
          label={`Amount (${sourceSym})`}
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          size="small"
          sx={{ minWidth: 160 }}
          InputLabelProps={{
            sx: { fontFamily: FONTS.mono, fontSize: '0.75rem' },
          }}
          InputProps={{ sx: { fontFamily: FONTS.mono, borderRadius: 0 } }}
        />
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.default',
          p: 2,
        }}
      >
        <Stack sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            Best miner
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '1rem',
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            {best ? `UID ${best.uid}` : '—'}
          </Typography>
        </Stack>
        <Stack sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            Rate
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '1rem',
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            {best ? parseFloat(best.rate).toFixed(6) : '—'} {destSym}/
            {sourceSym}
          </Typography>
        </Stack>
        <Stack sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            You receive
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '1rem',
              fontWeight: 700,
              color: 'primary.main',
            }}
          >
            {best ? best.out : '—'} {destSym}
          </Typography>
        </Stack>
      </Stack>

      <CopyRow label="CLI command" value={cliCmd} />
      <CopyRow label="curl + jq (best rate)" value={curlCmd} />
    </Stack>
  );
};

export default RateQuoteHelper;
