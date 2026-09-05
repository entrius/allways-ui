import React, { useMemo } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { useCrownRateHistory, useCurrentCrown } from '../../api';
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

// One ribbon stat: small label over a mono value.
const Stat: React.FC<{
  label: string;
  value: string;
  hint: string;
  color?: string;
}> = ({ label, value, hint, color }) => (
  <RailTooltip title={hint} placement="top">
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.6rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.78rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          color: color ?? 'text.primary',
        }}
      >
        {value}
      </Typography>
    </Box>
  </RailTooltip>
);

// The selected cell's card, exchange-header shape: pair, the number you
// clicked as the headline, the sentence it means, then the window's
// high/low and the spread. Everything is denominated the way the matrix is
// — the other asset per 1 of the hub column — so the headline IS the cell.
const DirectionCard: React.FC<{
  direction: Direction;
  // The hub column the cell sits in; prices read as quote per 1 of this.
  base: string;
  range: HeroRange;
  onRangeChange: (range: HeroRange) => void;
}> = ({ direction, base, range, onRangeChange }) => {
  const theme = useTheme();
  const secs = RANGE_SECS[range];
  const legs = decomposeDirection(direction);
  const quote = legs.from === base ? legs.to : legs.from;
  // A direction's natural quote is "received per 1 sent". When the sent
  // asset is the quote, that is the inverse of the matrix's unit.
  const inverted = legs.from !== base;
  const toPrice = (natural: number | null): number | null =>
    natural == null || !Number.isFinite(natural)
      ? null
      : inverted
        ? natural > 0
          ? 1 / natural
          : null
        : natural;
  const reverseDir =
    `${legs.to.toUpperCase()}-${legs.from.toUpperCase()}` as Direction;

  const { data: crown } = useCurrentCrown();
  // Lane scored on the base hub, the same lane the matrix column shows.
  const natural = directionalRateFor(
    direction,
    crownLaneFor(crown, direction, base)?.rate,
  );
  const price = toPrice(natural);
  const revNatural = directionalRateFor(
    reverseDir,
    crownLaneFor(crown, reverseDir, base)?.rate,
  );
  // The reverse route on the same ruler: it is the inverse whenever this
  // one is not, and vice versa.
  const revPrice =
    revNatural == null || !Number.isFinite(revNatural)
      ? null
      : inverted
        ? revNatural
        : revNatural > 0
          ? 1 / revNatural
          : null;
  // Spread the way a book prints it: ask minus bid as a percent of their
  // mid (the mid only normalises; it is never shown). On this ruler the
  // base sender's crown is the bid and the quote sender's is the ask.
  // Negative means the two crowns cross: a round trip comes out ahead.
  const bid = inverted ? revPrice : price;
  const ask = inverted ? price : revPrice;
  const spreadPct =
    bid != null && ask != null && bid + ask > 0
      ? ((ask - bid) / ((ask + bid) / 2)) * 100
      : null;
  const crossed = spreadPct != null && spreadPct < 0;

  // The same rows the chart draws, on the base hub's lane, so the ribbon's
  // high and low are points on the line below.
  const { data: selRows } = useCrownRateHistory({
    direction,
    secs,
    backing: base,
  });
  // Move, high and low over the window, all on the displayed ruler. The
  // live rate counts as a point so the range never excludes it.
  const { chg, high, low } = useMemo(() => {
    const pts = (selRows ?? [])
      .map((r) => toPrice(directionalRateFor(direction, r.rate)))
      .filter((v): v is number => v != null && Number.isFinite(v));
    const first = pts[0] ?? null;
    if (price != null) pts.push(price);
    const chg =
      first != null && first !== 0 && price != null
        ? ((price - first) / first) * 100
        : null;
    if (!pts.length) return { chg, high: null, low: null };
    return { chg, high: Math.max(...pts), low: Math.min(...pts) };
    // toPrice is derived from `inverted`, listed instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selRows, price, direction, inverted]);

  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const baseSym = chainSymbol(base);
  const quoteSym = chainSymbol(quote);

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
        {/* Pair, hub first, the way the matrix column and row read. */}
        <Box
          sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
        >
          <Box sx={{ display: 'inline-flex', position: 'relative', zIndex: 1 }}>
            <ChainLogo chain={base} size={16} />
          </Box>
          <Box sx={{ display: 'inline-flex', ml: -0.55 }}>
            <ChainLogo chain={quote} size={16} />
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
          {baseSym}
          <Box component="span" sx={{ color: 'text.disabled' }}>
            /
          </Box>
          {quoteSym}
        </Box>
        {chg != null && (
          <RailTooltip
            title={`How far this rate moved over ${range}.`}
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
                  chg === 0 ? 'text.secondary' : chg > 0 ? move.up : move.down,
              }}
            >
              {chg > 0 ? '▲ ' : chg < 0 ? '▼ ' : ''}
              {fmtChg(chg)}
            </Box>
          </RailTooltip>
        )}
        <Box sx={{ ml: 'auto', flexShrink: 0 }}>
          <RangeChips value={range} options={RANGES} onChange={onRangeChange} />
        </Box>
      </Box>

      {/* Which chains those letters actually mean, hub first. */}
      <Typography
        sx={{
          fontSize: '0.72rem',
          color: 'text.secondary',
          lineHeight: 1.3,
          pt: 0.25,
          ...ellipsisSx,
        }}
      >
        {chainName(base)}
        <Box component="span" sx={{ color: 'text.disabled', px: 0.4 }}>
          /
        </Box>
        {chainName(quote)}
      </Typography>

      {/* The number you clicked, in the unit you clicked it in. */}
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
          {price != null ? formatRate(price) : '—'}
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
          {quoteSym}
        </Typography>
        <Typography
          sx={{ fontSize: '0.72rem', color: 'text.disabled', ...ellipsisSx }}
        >
          per {baseSym}
        </Typography>
      </Box>

      {/* The sentence the cell means, read the way the matrix's hover
          reads it. */}
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.68rem',
          color: 'text.secondary',
          pt: 0.5,
          ...ellipsisSx,
        }}
      >
        {price == null
          ? 'No quote'
          : inverted
            ? `Send ${formatRate(price)} ${quoteSym} → get 1 ${baseSym}`
            : `Send 1 ${baseSym} → get ${formatRate(price)} ${quoteSym}`}
      </Typography>

      {/* The header ribbon every exchange puts under the price: the
          window's high and low beside the spread, label over value. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, auto)',
          justifyContent: 'start',
          columnGap: 3,
          pt: 1.5,
        }}
      >
        <Stat
          label={`${range} High`}
          value={high != null ? formatRate(high) : '—'}
          hint={`Highest crown rate for this direction over ${range}, in ${quoteSym} per ${baseSym}.`}
        />
        <Stat
          label={`${range} Low`}
          value={low != null ? formatRate(low) : '—'}
          hint={`Lowest crown rate for this direction over ${range}, in ${quoteSym} per ${baseSym}.`}
        />
        <Stat
          label={crossed ? 'Crossed' : 'Spread'}
          value={spreadPct != null ? `${spreadPct.toFixed(2)}%` : '—'}
          color={crossed ? move.up : undefined}
          hint={
            crossed
              ? `The two crowns overlap: ${baseSym} → ${quoteSym} pays more ${quoteSym} than ${quoteSym} → ${baseSym} asks for. Out and back at these rates comes out ahead by this much.`
              : `Gap between this direction's crown and the reverse direction's (${revPrice != null ? formatRate(revPrice) : '—'} ${quoteSym} per ${baseSym}, the other cell in this row), as a share of the two.`
          }
        />
      </Box>
    </Stack>
  );
};

export default DirectionCard;
