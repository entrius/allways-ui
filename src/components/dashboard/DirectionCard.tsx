import React, { useMemo } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { useCrownRateHistoryAll, useCurrentCrown } from '../../api';
import {
  crownLaneFor,
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { chainName, chainSymbol, formatRate } from '../../utils/format';
import { FONTS } from '../../theme';
import { ChainLogo } from '../ChainLogo';
import RangeChips from '../RangeChips';
import RailTooltip from './railTooltip';
import { MOVE_COLORS, type HeroRange, RANGE_SECS } from './AllwaysMarketRate';

const RANGES: readonly HeroRange[] = ['1H', '1D', '1W', '1M'];

// Registry names run long ("USDC (Arbitrum)"); they truncate rather than
// wrap so the card's height never moves on a selection change.
const ellipsisSx = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

// Percent move, compact past four digits so a scale-off test lane can't
// blow the card open.
const fmtChg = (chg: number): string => {
  const sign = chg > 0 ? '+' : '';
  if (Math.abs(chg) >= 10000)
    return `${sign}${new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(chg)}%`;
  return `${sign}${chg.toFixed(2)}%`;
};

const StatRow: React.FC<{
  label: string;
  value: string;
  hint: string;
  valueColor?: string;
}> = ({ label, value, hint, valueColor }) => (
  <RailTooltip title={hint} placement="top">
    <Stack
      direction="row"
      alignItems="baseline"
      spacing={0.75}
      sx={{ justifyContent: 'space-between', width: '100%', py: 0.35 }}
    >
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.74rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          color: valueColor ?? 'text.primary',
        }}
      >
        {value}
      </Typography>
    </Stack>
  </RailTooltip>
);

// The selected route's card, symbol-page shape: identity, then the number,
// then a key-stats list. Lifted out of the old pairs rail so it can sit
// beside the rate matrix. Bands are separated by whitespace and type weight
// rather than rules.
const DirectionCard: React.FC<{
  direction: Direction;
  range: HeroRange;
  onRangeChange: (range: HeroRange) => void;
}> = ({ direction, range, onRangeChange }) => {
  const theme = useTheme();
  const secs = RANGE_SECS[range];
  const { from, to } = decomposeDirection(direction);
  const reverseDir = `${to.toUpperCase()}-${from.toUpperCase()}` as Direction;

  const { data: crown } = useCurrentCrown();
  const selRate = directionalRateFor(
    direction,
    crownLaneFor(crown, direction)?.rate,
  );
  const revRate = directionalRateFor(
    reverseDir,
    crownLaneFor(crown, reverseDir)?.rate,
  );
  // Both routes' rates in one numeraire (to per 1 from): the selected route
  // as-is vs the reverse route inverted.
  const revImplied = revRate ? 1 / revRate : null;
  // SIGNED spread against the reverse route. Equals the round-trip gain:
  // positive means out-and-back at these crowns comes out ahead.
  const spreadPct =
    selRate != null && revImplied != null && revImplied !== 0
      ? ((selRate - revImplied) / revImplied) * 100
      : null;

  const { data: allSeries } = useCrownRateHistoryAll(secs);
  const selRows = allSeries?.[direction];
  const selChg = useMemo(() => {
    if (!selRows?.length || selRate == null) return null;
    const first = directionalRateFor(direction, selRows[0].rate);
    return first != null && first !== 0
      ? ((selRate - first) / first) * 100
      : null;
  }, [selRows, selRate, direction]);

  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const spreadColor =
    spreadPct == null || spreadPct === 0
      ? theme.palette.text.secondary
      : spreadPct > 0
        ? move.up
        : move.down;

  return (
    <Stack sx={{ minWidth: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.6,
          lineHeight: 1.2,
          minWidth: 0,
        }}
      >
        {/* The marks overlap into one pair glyph: the instrument is one
            object, not two assets that happen to be adjacent. */}
        <Box
          sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
        >
          <Box sx={{ display: 'inline-flex', position: 'relative', zIndex: 1 }}>
            <ChainLogo chain={from} size={16} />
          </Box>
          <Box sx={{ display: 'inline-flex', ml: -0.55 }}>
            <ChainLogo chain={to} size={16} />
          </Box>
        </Box>
        <Box
          component="span"
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            ...ellipsisSx,
          }}
        >
          {chainSymbol(from)}
          <Box component="span" sx={{ color: 'text.disabled' }}>
            /
          </Box>
          {chainSymbol(to)}
        </Box>
        {selChg != null && (
          <RailTooltip
            title={`How far this route's rate moved over ${range}.`}
            placement="top"
          >
            <Box
              component="span"
              sx={{
                pl: 0.75,
                flexShrink: 0,
                fontFamily: FONTS.mono,
                fontSize: '0.75rem',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color:
                  selChg === 0
                    ? 'text.secondary'
                    : selChg > 0
                      ? move.up
                      : move.down,
              }}
            >
              {fmtChg(selChg)}
            </Box>
          </RailTooltip>
        )}
        <Box sx={{ ml: 'auto', flexShrink: 0 }}>
          <RangeChips value={range} options={RANGES} onChange={onRangeChange} />
        </Box>
      </Box>

      {/* Which chains those three letters actually mean, sent-side first. */}
      <Typography
        sx={{
          fontSize: '0.72rem',
          color: 'text.secondary',
          lineHeight: 1.3,
          pt: 0.25,
          ...ellipsisSx,
        }}
      >
        {chainName(from)}
        <Box component="span" sx={{ color: 'text.disabled', px: 0.4 }}>
          /
        </Box>
        {chainName(to)}
      </Typography>

      {/* The rate, quoted the way a rate is quoted: the number, its unit,
          then what one unit of it buys. */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'baseline',
          gap: 0.5,
          minWidth: 0,
          pt: 1.25,
        }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '1.3rem',
            fontWeight: 700,
            lineHeight: 1.15,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {selRate != null ? formatRate(selRate) : '—'}
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.secondary',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {chainSymbol(to)}
        </Typography>
        <Typography
          sx={{ fontSize: '0.72rem', color: 'text.disabled', ...ellipsisSx }}
        >
          per {chainSymbol(from)}
        </Typography>
      </Box>

      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, pt: 1.75 }}>
        Key stats
      </Typography>
      <Box sx={{ pt: 0.5 }}>
        <StatRow
          label="Spread"
          value={
            spreadPct != null
              ? `${spreadPct > 0 ? '+' : ''}${spreadPct.toFixed(2)}%`
              : '—'
          }
          valueColor={spreadPct != null ? spreadColor : undefined}
          hint={`Gap against the reverse route, ${chainSymbol(to)} → ${chainSymbol(from)}, which pays ${revImplied != null ? formatRate(revImplied) : '—'} in this route's unit. Positive: a round trip comes out ahead. Negative: it costs you this much.`}
        />
      </Box>
    </Stack>
  );
};

export default DirectionCard;
