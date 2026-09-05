import React, { useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useMiners, minerServesPair, type Miner } from '../../api';
import {
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import { chainSymbol, unitsToHuman } from '../../utils/format';
import { MOVE_COLORS } from './AllwaysMarketRate';
import { OrderbookDepthSkeleton } from './Skeletons';

// Price grouping, the way an exchange's precision picker works: levels
// merge into buckets one tick wide, and the picker lists the tick sizes
// themselves (0.0001, 0.001, ...) rather than a percentage. The tick scale
// follows the book — the finest option is ~0.001% of the best rate — so the
// same four steps fit a 0.00096 book and a 715 book. null = auto, which
// picks the finest step that fits each side without a scrollbar.
type DepthGroup = number | null;
const GROUP_MULTS = [1, 10, 100, 1000] as const;
const AUTO_FIT_ROWS = 6;

// The finest tick for a book whose best rate is `best`.
const tickBase = (best: number): number =>
  Math.pow(10, Math.floor(Math.log10(best)) - 4);

// Decimal places that print a tick exactly: every price in a book shares
// them, so the price column lines up like a ladder.
const tickDecimals = (tick: number): number =>
  Math.max(0, -Math.floor(Math.log10(tick) + 1e-9));

interface Level {
  // Directional rate of the level, "to per 1 from" of `direction`.
  r: number;
  // Capacity at this level in the asset the taker SENDS.
  cap: number;
}

interface Side {
  levels: Level[];
  // The tick the levels were grouped on (0 when the side is empty).
  tick: number;
}

// One direction's TAKEABLE liquidity grouped by quoted rate, best rate
// first. Only collateral hittable this instant counts — active miners that
// are not reserved or mid-swap — so the top of the book always agrees with
// the crown. Capacity is collateral on the miner's backing leg, and a quote's
// own rate is exactly the exchange on that leg, so every level converts to
// the asset the taker sends: cap as-is when the backing is the sent asset,
// cap / rate when it is the received one.
const useDepth = (
  miners: Miner[] | undefined,
  direction: Direction,
  group: DepthGroup,
): Side => {
  const { from, to, leg } = decomposeDirection(direction);
  return useMemo(() => {
    const entries: Level[] = [];
    (miners ?? []).forEach((m) => {
      if (!minerServesPair(m, from, to)) return;
      if (!m.isActive || m.hasActiveSwap || m.isReserved) return;
      if (!m.collateral) return;
      const backing = (m.backing ?? 'sol').toLowerCase();
      const collateral = unitsToHuman(m.collateral, backing);
      if (!Number.isFinite(collateral) || collateral <= 0) return;
      const raw = leg === 'reverse' ? m.counterRate : m.rate;
      const r = directionalRateFor(direction, raw) ?? 0;
      if (!Number.isFinite(r) || r <= 0) return;
      entries.push({ r, cap: backing === from ? collateral : collateral / r });
    });
    if (!entries.length) return { levels: [], tick: 0 };

    const best = entries.reduce((mx, e) => (e.r > mx ? e.r : mx), 0);
    const base = tickBase(best);
    const bucketize = (mult: number) => {
      const tick = base * mult;
      const buckets = new Map<number, number>();
      for (const e of entries) {
        // Floor to the tick (epsilon dodges float drift), so a level's label
        // never overstates the rate a taker would get.
        const b = Math.floor(e.r / tick + 1e-9) * tick;
        buckets.set(b, (buckets.get(b) ?? 0) + e.cap);
      }
      return { buckets, tick };
    };

    let grouped = bucketize(group ?? 1);
    if (group == null) {
      for (const mult of GROUP_MULTS) {
        grouped = bucketize(mult);
        if (grouped.buckets.size <= AUTO_FIT_ROWS) break;
      }
    }

    // More output per unit in is always better, so best-first is
    // highest-first.
    return {
      levels: [...grouped.buckets.keys()]
        .sort((a, b) => b - a)
        .map((r) => ({ r, cap: grouped.buckets.get(r) ?? 0 })),
      tick: grouped.tick,
    };
  }, [miners, from, to, leg, direction, group]);
};

interface Row {
  price: number;
  size: number;
  total: number;
  // Cumulative value of the levels up to this one, in the received asset
  // (size × price summed), for the hover's average and sums.
  quote: number;
}

// The pair's book in the traditional shape: one price column in the
// selected direction's unit, the OTHER direction's levels stacked above the
// spread (inverted into this unit, sized in the same asset), this
// direction's levels below it, best rates meeting in the middle. Above is
// tinted red and below green, as on every exchange, so the eye lands where
// it expects; the words stay directional (the side you send from) because
// each side is its own instrument — nothing is netted across the line.
const OrderbookDepth: React.FC<{
  direction: Direction;
}> = ({ direction }) => {
  const theme = useTheme();
  const { data: miners, isLoading } = useMiners();
  const [group, setGroup] = useState<DepthGroup>(null);
  // Hovered level, keyed by side and index from the line outward: every
  // level between the line and it lights up, and the hovered row explains
  // what filling down to it would cost, the way Binance's "Avg & Sum" does.
  const [hover, setHover] = useState<{
    side: 'above' | 'below';
    i: number;
  } | null>(null);
  const { from, to } = decomposeDirection(direction);
  const reverse = `${to.toUpperCase()}-${from.toUpperCase()}` as Direction;

  const near = useDepth(miners, direction, group);
  const far = useDepth(miners, reverse, group);

  // This direction: price is the level's own rate, size already in `from`.
  // Index 0 is the best level, right under the line.
  const below = useMemo<Row[]>(() => {
    let total = 0;
    let quote = 0;
    return near.levels.map((l) => {
      total += l.cap;
      quote += l.cap * l.r;
      return { price: l.r, size: l.cap, total, quote };
    });
  }, [near]);

  // The other direction, on this ruler: a level paying q `from` per 1 `to`
  // is a price of 1/q `to` per `from`, and its capacity in `to` is q times
  // that in `from`. Best for its taker is the LOWEST price here, so index 0
  // is again the level nearest the line; the block renders reversed.
  const above = useMemo<Row[]>(() => {
    let total = 0;
    let quote = 0;
    return far.levels.map((l) => {
      const price = 1 / l.r;
      const size = l.cap * l.r;
      total += size;
      quote += size * price;
      return { price, size, total, quote };
    });
  }, [far]);

  const maxAbove = above.reduce((m, r) => Math.max(m, r.total), 1);
  const maxBelow = below.reduce((m, r) => Math.max(m, r.total), 1);

  // Spread between the two sides' best levels, absolute and as a percent of
  // their mid — the pair of numbers every exchange prints on the line. The
  // mid only normalises the percent; it is never shown.
  const bestBelow = below[0]?.price ?? null;
  const bestAbove = above[0]?.price ?? null;
  const spreadAbs =
    bestBelow != null && bestAbove != null
      ? Math.abs(bestAbove - bestBelow)
      : null;
  const spreadPct =
    spreadAbs != null && bestAbove != null && bestBelow != null
      ? (spreadAbs / ((bestAbove + bestBelow) / 2)) * 100
      : null;

  // One decimal count for the whole book, from the finer of the two ticks.
  const tick = Math.min(near.tick || Infinity, far.tick || Infinity);
  const decimals = Number.isFinite(tick) ? tickDecimals(tick) : 5;
  const fmtPrice = (v: number) => v.toFixed(decimals);
  // Tick labels for the precision picker, on this direction's scale.
  const best = near.levels[0]?.r ?? above[0]?.price ?? null;
  const base = best ? tickBase(best) : null;

  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const tone = { above: move.down, below: move.up } as const;

  const unit = chainSymbol(from);
  const quoteUnit = chainSymbol(to);
  const priceUnit = `${quoteUnit}/${unit}`;
  const sideLabel = (d: Direction) => d.replace('-', ' → ');

  const headerSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.62rem',
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    px: 1,
    py: 0.5,
  };

  const cellSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.72rem',
    borderBottom: `1px solid ${theme.palette.divider}`,
    px: 1,
    py: 0.5,
    fontVariantNumeric: 'tabular-nums' as const,
    whiteSpace: 'nowrap' as const,
  };

  const renderRow = (
    row: Row,
    i: number,
    side: 'above' | 'below',
    max: number,
  ) => {
    const pct = (row.total / max) * 100;
    const color = tone[side];
    const inRange = hover?.side === side && i <= hover.i;
    const isHovered = hover?.side === side && i === hover.i;
    const avg = row.total > 0 ? row.quote / row.total : null;
    const cell = (
      <TableRow
        key={`${side}-${row.price}`}
        onMouseEnter={() => setHover({ side, i })}
        onMouseLeave={() => setHover(null)}
        sx={{
          backgroundColor: inRange ? 'action.hover' : 'transparent',
          backgroundImage: `linear-gradient(to left, ${alpha(color, 0.14)} ${pct}%, transparent ${pct}%)`,
          cursor: 'default',
        }}
      >
        <TableCell sx={{ ...cellSx, color }}>{fmtPrice(row.price)}</TableCell>
        <TableCell
          sx={{ ...cellSx, display: { xs: 'none', sm: 'table-cell' } }}
          align="right"
        >
          {row.size.toFixed(2)}
        </TableCell>
        <TableCell sx={{ ...cellSx, fontWeight: 600 }} align="right">
          {row.total.toFixed(2)}
        </TableCell>
      </TableRow>
    );
    return (
      <Tooltip
        key={`${side}-${row.price}-tip`}
        open={isHovered}
        placement="left"
        arrow
        disableHoverListener
        disableFocusListener
        disableTouchListener
        title={
          <Box
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.66rem',
              display: 'grid',
              gridTemplateColumns: 'auto auto',
              columnGap: 1.5,
              rowGap: 0.25,
            }}
          >
            <span>Avg rate</span>
            <Box component="span" sx={{ textAlign: 'right' }}>
              {avg != null ? fmtPrice(avg) : '—'} {quoteUnit}
            </Box>
            <span>Sum {unit}</span>
            <Box component="span" sx={{ textAlign: 'right' }}>
              {row.total.toFixed(2)}
            </Box>
            <span>Sum {quoteUnit}</span>
            <Box component="span" sx={{ textAlign: 'right' }}>
              {row.quote.toFixed(2)}
            </Box>
          </Box>
        }
      >
        {cell}
      </Tooltip>
    );
  };

  const emptyRow = (side: Direction) => (
    <TableRow key={`${side}-empty`}>
      <TableCell
        colSpan={3}
        sx={{
          ...cellSx,
          textAlign: 'center',
          py: 1.5,
          color: 'text.secondary',
        }}
      >
        No open liquidity for {sideLabel(side)}
      </TableCell>
    </TableRow>
  );

  if (isLoading || !miners) return <OrderbookDepthSkeleton />;

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            Order book
          </Typography>
          <Tooltip
            title={
              <Box sx={{ maxWidth: 260 }}>
                Resting liquidity for the pair, both directions on one price
                ruler: active miners' collateral grouped by rate, in the asset
                you send at each level's own rate. Red, above the line, is{' '}
                {sideLabel(reverse)} with its best rate nearest the line; green,
                below, is {sideLabel(direction)}, best first. Total is how much
                could move at that rate or better. Hover a level for the average
                rate and sums down to it.
              </Box>
            }
            arrow
            placement="right"
          >
            <IconButton size="small" sx={{ p: 0, color: 'text.secondary' }}>
              <InfoOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
        {/* Precision picker: the tick sizes themselves, like an exchange's. */}
        <Tooltip
          title={
            <Box sx={{ maxWidth: 260 }}>
              Group levels into price buckets this wide. Auto picks the finest
              that fits.
            </Box>
          }
          arrow
          placement="top"
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {[null, ...GROUP_MULTS].map((mult) => {
              const label =
                mult == null
                  ? 'Auto'
                  : base != null
                    ? (base * mult).toFixed(tickDecimals(base * mult))
                    : `×${mult}`;
              return (
                <Box
                  key={label}
                  component="button"
                  onClick={() => setGroup(mult)}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontFamily: FONTS.mono,
                    fontSize: '0.6rem',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    px: 0.75,
                    py: 0.25,
                    fontVariantNumeric: 'tabular-nums',
                    color:
                      group === mult
                        ? theme.palette.background.paper
                        : theme.palette.text.secondary,
                    backgroundColor:
                      group === mult
                        ? theme.palette.text.primary
                        : 'transparent',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor:
                        group === mult
                          ? theme.palette.text.primary
                          : theme.palette.action.hover,
                    },
                  }}
                >
                  {label}
                </Box>
              );
            })}
          </Box>
        </Tooltip>
      </Box>

      <TableContainer
        sx={{
          flex: 1,
          minHeight: 0,
          overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.border.light,
            borderRadius: 0,
          },
        }}
      >
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerSx, width: { xs: '52%', sm: '40%' } }}>
                Price ({priceUnit})
              </TableCell>
              <TableCell
                sx={{
                  ...headerSx,
                  width: '32%',
                  display: { xs: 'none', sm: 'table-cell' },
                }}
                align="right"
              >
                Size ({unit})
              </TableCell>
              <TableCell
                sx={{ ...headerSx, width: { xs: '48%', sm: '28%' } }}
                align="right"
              >
                Total ({unit})
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {above.length
              ? [...above]
                  .map((row, i) => renderRow(row, i, 'above', maxAbove))
                  .reverse()
              : emptyRow(reverse)}

            {/* The line the two sides meet at: which direction is on which
                side, and the gap between their best levels. */}
            <TableRow>
              <TableCell
                colSpan={3}
                sx={{
                  ...cellSx,
                  py: 0.6,
                  borderTop: `1px solid ${theme.palette.border.light}`,
                  borderBottom: `1px solid ${theme.palette.border.light}`,
                  backgroundColor: 'background.default',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    fontFamily: FONTS.mono,
                    fontSize: '0.62rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  <Box component="span" sx={{ color: tone.above }}>
                    ↑ {sideLabel(reverse)}
                  </Box>
                  <Box component="span" sx={{ color: 'text.primary' }}>
                    spread{' '}
                    <Box component="span" sx={{ fontWeight: 600 }}>
                      {spreadAbs != null ? fmtPrice(spreadAbs) : '—'}
                    </Box>
                    {spreadPct != null && (
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        {' '}
                        ({spreadPct.toFixed(2)}%)
                      </Box>
                    )}
                  </Box>
                  <Box component="span" sx={{ color: tone.below }}>
                    ↓ {sideLabel(direction)}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>

            {below.length
              ? below.map((row, i) => renderRow(row, i, 'below', maxBelow))
              : emptyRow(direction)}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default OrderbookDepth;
