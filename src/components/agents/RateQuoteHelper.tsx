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
import { useCopy } from '../../hooks';
import HoverCard from '../HoverCard';
import { formatRate, trimTrailingZeros } from '../../utils/format';

type Direction = 'BTC->TAO' | 'TAO->BTC';

interface BestQuote {
  uid: number;
  hotkey: string;
  // Raw rate from the API, always expressed as TAO per 1 BTC regardless of
  // direction (canonical_dest per 1 canonical_source — see Miner model docs).
  rawRate: string;
  // Effective rate for the user's chosen direction (destSym per 1 sourceSym).
  // For BTC->TAO that's `rawRate`; for TAO->BTC it's `1 / rawRate`.
  effectiveRate: number;
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
  // Canonical ordering: API returns sourceChain='btc', destChain='tao'
  // (lowercase). Both `rate` (BTC->TAO) and `counterRate` (TAO->BTC) are in
  // the same canonical unit: TAO per 1 BTC. So the "best" deal flips:
  //   - BTC->TAO: highest rate (most TAO per BTC sold)
  //   - TAO->BTC: lowest counterRate (least TAO to buy 1 BTC)
  // Filter case-insensitively so a future casing change on the API doesn't
  // silently zero this out again.
  const isForward = direction === 'BTC->TAO';
  const candidates = miners
    .filter((m) => m.isActive)
    .map((m) => {
      const src = (m.sourceChain ?? '').toLowerCase();
      const dst = (m.destChain ?? '').toLowerCase();
      if (src !== 'btc' || dst !== 'tao') return null;
      const r = isForward ? m.rate : m.counterRate;
      if (!r) return null;
      const parsed = parseFloat(r);
      if (!isFinite(parsed) || parsed <= 0) return null;
      return { uid: m.uid, hotkey: m.hotkey, rawRate: r, parsed };
    })
    .filter(
      (
        x,
      ): x is {
        uid: number;
        hotkey: string;
        rawRate: string;
        parsed: number;
      } => x !== null,
    );

  if (candidates.length === 0) return null;
  const best = candidates.reduce((a, b) =>
    isForward ? (a.parsed >= b.parsed ? a : b) : a.parsed <= b.parsed ? a : b,
  );
  const effectiveRate = isForward ? best.parsed : 1 / best.parsed;
  // 8 decimals covers BTC's smallest unit so a small TAO->BTC quote still
  // renders with usable precision instead of rounding to zero. Trim trailing
  // zeros so a clean number doesn't display with eight padding digits.
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
  const [direction, setDirection] = useState<Direction>('BTC->TAO');
  const [amountStr, setAmountStr] = useState('0.01');
  const amount = parseFloat(amountStr) || 0;

  const best = useMemo(
    () => (miners ? computeBest(miners, direction, amount) : null),
    [miners, direction, amount],
  );

  const sourceSym = direction === 'BTC->TAO' ? 'BTC' : 'TAO';
  const destSym = direction === 'BTC->TAO' ? 'TAO' : 'BTC';

  const fromArg = sourceSym.toLowerCase();
  const toArg = destSym.toLowerCase();
  const destLabel = destSym.toLowerCase();
  const sourceLabel = sourceSym.toLowerCase();
  const cliCmd = best
    ? `alw swap now --auto --yes --from ${fromArg} --to ${toArg} --amount ${amount} --receive-address <your-${destLabel}-address> --from-address <your-${sourceLabel}-address>`
    : `# no active miner quoting ${sourceSym} -> ${destSym} right now`;

  // Both `rate` (BTC->TAO) and `counterRate` (TAO->BTC) are stored as
  // TAO per 1 BTC, so the "best" miner flips by direction: forward picks
  // the highest (most TAO out per BTC in), reverse picks the lowest (least
  // TAO in per BTC out).
  const rateField = direction === 'BTC->TAO' ? '.rate' : '.counterRate';
  const sortExpr =
    direction === 'BTC->TAO' ? '-(.rate | tonumber)' : '(.rate | tonumber)';
  const curlCmd = `curl -s https://api.all-ways.io/miners | jq '.[] | select(.isActive and (.sourceChain | ascii_downcase) == "btc" and (.destChain | ascii_downcase) == "tao") | {uid, rate: ${rateField}, hotkey}' | jq -s 'sort_by(${sortExpr})[0]'`;

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
              {best ? `UID ${best.uid}` : '—'}
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
