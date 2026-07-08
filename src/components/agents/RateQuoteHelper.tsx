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
import {
  ALL_DIRECTIONS,
  decomposeDirection,
  directionLabel,
  useMiners,
  type Direction,
} from '../../api';
import { useCopy } from '../../hooks';
import HoverCard from '../HoverCard';
import { formatRate, trimTrailingZeros } from '../../utils/format';

interface BestQuote {
  uid: number | null;
  hotkey: string;
  // The miner's quote for the chosen leg, "dest per 1 source" (forward =
  // m.rate, reverse = m.counterRate — see Miner model docs).
  rawRate: string;
  // Same value, as a number: destSym per 1 sourceSym.
  effectiveRate: number;
  out: string;
}

const computeBest = (
  miners: {
    rate: string | null;
    counterRate: string | null;
    uid: number | null;
    hotkey: string;
    isActive: boolean;
    sourceChain: string | null;
    destChain: string | null;
  }[],
  direction: Direction,
  amount: number,
): BestQuote | null => {
  // A miner serves one hub↔spoke pair; canonical order pins SOL as source, so
  // its spoke is the non-SOL leg. The forward leg (SOL→spoke) is quoted in
  // m.rate, the reverse (spoke→SOL) in m.counterRate — both "dest per 1
  // source", so more output per unit in is always the better deal (highest
  // first). Filter case-insensitively so an API casing change can't zero this.
  const { spoke, leg } = decomposeDirection(direction);
  const candidates = miners
    .filter((m) => m.isActive)
    .map((m) => {
      const src = (m.sourceChain ?? '').toLowerCase();
      const dst = (m.destChain ?? '').toLowerCase();
      const minerSpoke = src === 'sol' ? dst : src;
      if (minerSpoke !== spoke) return null;
      const r = leg === 'reverse' ? m.counterRate : m.rate;
      if (!r) return null;
      const parsed = parseFloat(r);
      if (!isFinite(parsed) || parsed <= 0) return null;
      return { uid: m.uid, hotkey: m.hotkey, rawRate: r, parsed };
    })
    .filter(
      (
        x,
      ): x is {
        uid: number | null;
        hotkey: string;
        rawRate: string;
        parsed: number;
      } => x !== null,
    );

  if (candidates.length === 0) return null;
  const best = candidates.reduce((a, b) => (a.parsed >= b.parsed ? a : b));
  const effectiveRate = best.parsed;
  // 8 decimals covers BTC's smallest unit so a small quote still renders with
  // usable precision instead of rounding to zero. Trim trailing zeros so a
  // clean number doesn't display with eight padding digits.
  const out = trimTrailingZeros((effectiveRate * amount).toFixed(8));
  return {
    uid: best.uid,
    hotkey: best.hotkey,
    rawRate: best.rawRate,
    effectiveRate,
    out,
  };
};

interface CopyRowProps {
  label: string;
  value: string;
}

const CopyRow: React.FC<CopyRowProps> = ({ label, value }) => {
  const { copied, copy } = useCopy();
  return (
    <Stack spacing={0.75}>
      <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
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
            onClick={() => copy(value)}
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
  const [direction, setDirection] = useState<Direction>('SOL-BTC');
  const [amountStr, setAmountStr] = useState('0.01');
  const amount = parseFloat(amountStr) || 0;

  const best = useMemo(
    () => (miners ? computeBest(miners, direction, amount) : null),
    [miners, direction, amount],
  );

  const { from, to, spoke, leg } = decomposeDirection(direction);
  const sourceSym = from.toUpperCase();
  const destSym = to.toUpperCase();

  const cliCmd = best
    ? `alw swap now --auto --yes --from ${from} --to ${to} --amount ${amount} --receive-address <your-${to}-address> --from-address <your-${from}-address>`
    : `# no active miner quoting ${sourceSym} -> ${destSym} right now`;

  // The miner row is canonical (sourceChain=sol, destChain=spoke); the leg
  // picks which quote to read (forward = .rate, reverse = .counterRate). Both
  // are "dest per 1 source", so the best deal is always the highest.
  const rateField = leg === 'reverse' ? '.counterRate' : '.rate';
  const curlCmd = `curl -s https://api.all-ways.io/miners | jq '.[] | select(.isActive and (.sourceChain | ascii_downcase) == "sol" and (.destChain | ascii_downcase) == "${spoke}") | {uid, rate: ${rateField}, hotkey}' | jq -s 'sort_by(-(.rate | tonumber))[0]'`;

  return (
    <HoverCard
      sx={{
        p: { xs: 2.5, md: 3 },
        backgroundColor: 'surface.light',
      }}
    >
      <Stack sx={{ gap: 2 }}>
        <Stack spacing={0.5}>
          <Typography variant="eyebrow" sx={{ letterSpacing: '0.15em' }}>
            Live rate quote
          </Typography>
          <Typography
            variant="display"
            sx={{
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
            {ALL_DIRECTIONS.map((d) => (
              <MenuItem key={d} value={d}>
                {directionLabel(d)}
              </MenuItem>
            ))}
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
            <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
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
              {best ? `UID ${best.uid ?? '—'}` : '—'}
            </Typography>
          </Stack>
          <Stack sx={{ flex: 1 }}>
            <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
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
              {best ? formatRate(best.effectiveRate) : '—'} {destSym}/
              {sourceSym}
            </Typography>
          </Stack>
          <Stack sx={{ flex: 1 }}>
            <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
              User receives
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
    </HoverCard>
  );
};

export default RateQuoteHelper;
