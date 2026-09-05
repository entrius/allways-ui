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
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useMiners, minerServesPair, type Miner } from '../../api';
import {
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import { chainSymbol, formatRate, unitsToHuman } from '../../utils/format';
import { MOVE_COLORS } from './AllwaysMarketRate';
import { OrderbookDepthSkeleton } from './Skeletons';

// Price grouping, shared by both sides and expressed as a share of the price
// so one control reads the same on a 0.00096 book and a 715 book: levels
// merge into buckets roughly this fraction of the price wide. null = auto,
// which picks the finest option that fits each side without a scrollbar.
type DepthGroup = number | null;
const GROUP_OPTIONS: { label: string; mult: number | null }[] = [
  { label: 'Auto', mult: null },
  { label: '0.001%', mult: 1 },
  { label: '0.01%', mult: 10 },
  { label: '0.1%', mult: 100 },
  { label: '1%', mult: 1000 },
];
const AUTO_FIT_ROWS = 6;

interface Level {
  // Directional rate of the level, "to per 1 from" of `direction`.
  r: number;
  // Capacity at this level in the asset the taker SENDS.
  cap: number;
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
): Level[] => {
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
    if (!entries.length) return [];

    // The side's concrete tick for a grouping option: ~0.001% of the best
    // rate at the finest setting, scaling ×10 per step.
    const best = entries.reduce((mx, e) => (e.r > mx ? e.r : mx), 0);
    const base = Math.pow(10, Math.floor(Math.log10(best)) - 4);
    const bucketize = (mult: number) => {
      const tick = base * mult;
      const buckets = new Map<number, number>();
      for (const e of entries) {
        // Floor to the tick (epsilon dodges float drift), so a level's label
        // never overstates the rate a taker would get.
        const b = Math.floor(e.r / tick + 1e-9) * tick;
        buckets.set(b, (buckets.get(b) ?? 0) + e.cap);
      }
      return buckets;
    };

    let buckets = bucketize(group ?? 1);
    if (group == null) {
      for (const { mult } of GROUP_OPTIONS) {
        if (mult == null) continue;
        buckets = bucketize(mult);
        if (buckets.size <= AUTO_FIT_ROWS) break;
      }
    }

    // More output per unit in is always better, so best-first is
    // highest-first.
    return [...buckets.keys()]
      .sort((a, b) => b - a)
      .map((r) => ({ r, cap: buckets.get(r) ?? 0 }));
  }, [miners, from, to, leg, direction, group]);
};

interface Row {
  price: number;
  size: number;
  total: number;
}

// "2.23" in the number weight, the unit trailing in secondary type.
const Amount: React.FC<{ value: number; unit: string; strong?: boolean }> = ({
  value,
  unit,
  strong,
}) => (
  <>
    <Box
      component="span"
      sx={{ color: 'text.primary', fontWeight: strong ? 600 : 400 }}
    >
      {value.toFixed(2)}
    </Box>
    <Box component="span" sx={{ color: 'text.secondary', pl: 0.5 }}>
      {unit}
    </Box>
  </>
);

// The pair's book in the traditional shape: one price column in the
// selected direction's unit, the OTHER direction's levels stacked above the
// spread (inverted into this unit, sized in the same asset), this
// direction's levels below it, best rates meeting in the middle. Each side
// is still its own instrument — nothing is netted or averaged across the
// line — the layout just puts the two on one ruler.
const OrderbookDepth: React.FC<{
  direction: Direction;
}> = ({ direction }) => {
  const theme = useTheme();
  const { data: miners, isLoading } = useMiners();
  const [group, setGroup] = useState<DepthGroup>(null);
  const { from, to } = decomposeDirection(direction);
  const reverse = `${to.toUpperCase()}-${from.toUpperCase()}` as Direction;

  const near = useDepth(miners, direction, group);
  const far = useDepth(miners, reverse, group);

  // This direction: price is the level's own rate, size already in `from`.
  // Totals accumulate from the best level (top of the block) downward.
  const below = useMemo<Row[]>(() => {
    let total = 0;
    return near.map((l) => {
      total += l.cap;
      return { price: l.r, size: l.cap, total };
    });
  }, [near]);

  // The other direction, on this ruler: a level paying q `from` per 1 `to`
  // is a price of 1/q `to` per `from`, and its capacity in `to` is q times
  // that in `from`. Best for its taker is the LOWEST price here, so totals
  // accumulate from the level nearest the spread outward, and the block
  // renders worst-first so the best sits against the line.
  const above = useMemo<Row[]>(() => {
    let total = 0;
    return far
      .map((l) => ({ price: 1 / l.r, size: l.cap * l.r }))
      .map((l) => {
        total += l.size;
        return { ...l, total };
      })
      .reverse();
  }, [far]);

  const maxAbove = above.reduce((m, r) => Math.max(m, r.total), 1);
  const maxBelow = below.reduce((m, r) => Math.max(m, r.total), 1);

  // Signed spread between the two best levels, in this direction's unit,
  // the same number the card reports.
  const bestBelow = below[0]?.price ?? null;
  const bestAbove = above.length ? above[above.length - 1].price : null;
  const spreadPct =
    bestBelow != null && bestAbove != null && bestAbove !== 0
      ? ((bestBelow - bestAbove) / bestAbove) * 100
      : null;
  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const spreadColor =
    spreadPct == null || spreadPct === 0
      ? theme.palette.text.secondary
      : spreadPct > 0
        ? move.up
        : move.down;

  const unit = chainSymbol(from);
  const priceUnit = `${chainSymbol(to)}/${chainSymbol(from)}`;
  const sideLabel = (d: Direction) => d.replace('-', ' → ');

  // Monochrome depth bars, matching the house chart style.
  const barColor = `color-mix(in srgb, ${theme.palette.text.primary} 10%, transparent)`;

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

  const renderRow = (row: Row, max: number, side: Direction) => {
    const pct = (row.total / max) * 100;
    return (
      <TableRow
        key={`${side}-${row.price}`}
        title={`${sideLabel(side)}: ${row.size.toFixed(2)} ${unit} at this level, ${row.total.toFixed(2)} ${unit} at this rate or better`}
        sx={{
          backgroundColor: 'transparent',
          backgroundImage: `linear-gradient(to left, ${barColor} ${pct}%, transparent ${pct}%)`,
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        <TableCell sx={{ ...cellSx, color: 'text.primary' }}>
          {formatRate(row.price)}
        </TableCell>
        <TableCell
          sx={{ ...cellSx, display: { xs: 'none', sm: 'table-cell' } }}
          align="right"
        >
          <Amount value={row.size} unit={unit} />
        </TableCell>
        <TableCell sx={cellSx} align="right">
          <Amount value={row.total} unit={unit} strong />
        </TableCell>
      </TableRow>
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
            Orderbook
          </Typography>
          <Tooltip
            title={
              <Box sx={{ maxWidth: 260 }}>
                Resting liquidity for the pair, both directions on one price
                ruler: active miners' collateral grouped by quoted rate,
                expressed in the asset you send at each level's own rate. Above
                the line is {sideLabel(reverse)}, best rate nearest the line;
                below it is {sideLabel(direction)}, best rate first. Total is
                how much could move at that rate or better; the bar behind each
                row draws it.
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
        {/* Grouping, phrased as bucket width relative to price so the same
            chips make sense on both sides of the book. */}
        <Tooltip
          title={
            <Box sx={{ maxWidth: 260 }}>
              Group nearby price levels into buckets this wide (as a share of
              the price) — e.g. 0.1% merges quotes within about 0.1% of each
              other.
            </Box>
          }
          arrow
          placement="top"
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {GROUP_OPTIONS.map(({ label, mult }) => (
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
                  color:
                    group === mult
                      ? theme.palette.background.paper
                      : theme.palette.text.secondary,
                  backgroundColor:
                    group === mult ? theme.palette.text.primary : 'transparent',
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
            ))}
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
                Rate ({priceUnit})
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
              ? above.map((row) => renderRow(row, maxAbove, reverse))
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
                  <span>↑ {sideLabel(reverse)}</span>
                  <Box
                    component="span"
                    sx={{ fontWeight: 600, color: spreadColor }}
                  >
                    spread{' '}
                    {spreadPct != null
                      ? `${spreadPct > 0 ? '+' : ''}${spreadPct.toFixed(2)}%`
                      : '—'}
                  </Box>
                  <span>↓ {sideLabel(direction)}</span>
                </Box>
              </TableCell>
            </TableRow>

            {below.length
              ? below.map((row) => renderRow(row, maxBelow, direction))
              : emptyRow(direction)}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default OrderbookDepth;
