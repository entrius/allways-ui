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
import MonoSelect from '../MonoSelect';

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
  // Price on the ruler: quote per 1 base.
  price: number;
  // Capacity at this level in the base asset.
  size: number;
}

interface Side {
  // Nearest the line first.
  levels: Level[];
  // The tick the levels were grouped on (0 when the side is empty).
  tick: number;
  // The side's finest tick, and how many buckets each step of the picker
  // would leave: the picker offers only steps that still separate levels.
  scale: number;
  bucketsAt: Record<number, number>;
}

// One direction's TAKEABLE liquidity, put on the pair's ruler (quote per 1
// base) and grouped by tick, nearest-the-line first. Only collateral
// hittable this instant counts — active miners that are not reserved or
// mid-swap — so the top of the book always agrees with the crown. Capacity
// is collateral on the miner's backing leg, and a quote's own rate is
// exactly the exchange on that leg, so every level converts to the asset
// the taker sends; senders of the quote are then flipped onto the ruler
// (price = 1/rate, size = sent × rate). Grouping rounds AWAY from the
// taker — down for base senders, up for quote senders — so a level's label
// never overstates the rate a taker would get.
const useDepth = (
  miners: Miner[] | undefined,
  direction: Direction,
  base: string,
  group: DepthGroup,
): Side => {
  const { from, to, leg } = decomposeDirection(direction);
  const sendsBase = from === base;
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
      const sent = backing === from ? collateral : collateral / r;
      entries.push(
        sendsBase ? { price: r, size: sent } : { price: 1 / r, size: sent * r },
      );
    });
    if (!entries.length)
      return { levels: [], tick: 0, scale: 0, bucketsAt: {} };

    // The level nearest the line sets the tick scale.
    const best = entries.reduce(
      (b, e) => (sendsBase ? Math.max(b, e.price) : Math.min(b, e.price)),
      sendsBase ? 0 : Infinity,
    );
    const scale = tickBase(best);
    const bucketize = (mult: number) => {
      const tick = scale * mult;
      const buckets = new Map<number, number>();
      for (const e of entries) {
        // Epsilon dodges float drift at exact tick multiples.
        const q = e.price / tick;
        const b =
          (sendsBase ? Math.floor(q + 1e-9) : Math.ceil(q - 1e-9)) * tick;
        buckets.set(b, (buckets.get(b) ?? 0) + e.size);
      }
      return { buckets, tick };
    };

    const bucketsAt: Record<number, number> = {};
    for (const mult of GROUP_MULTS)
      bucketsAt[mult] = bucketize(mult).buckets.size;

    let grouped = bucketize(group ?? 1);
    if (group == null) {
      for (const mult of GROUP_MULTS) {
        grouped = bucketize(mult);
        if (grouped.buckets.size <= AUTO_FIT_ROWS) break;
      }
    }

    return {
      levels: [...grouped.buckets.keys()]
        .sort((a, b) => (sendsBase ? b - a : a - b))
        .map((price) => ({ price, size: grouped.buckets.get(price) ?? 0 })),
      tick: grouped.tick,
      scale,
      bucketsAt,
    };
  }, [miners, from, to, leg, direction, group, sendsBase]);
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
  // The selected direction — decides which side of the line is "yours".
  direction: Direction;
  // The hub the book is priced against: prices are the other asset per 1
  // of this, exactly the matrix's unit, so the cell you clicked is a level
  // on this ladder.
  base: string;
}> = ({ direction, base }) => {
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
  const legs = decomposeDirection(direction);
  const from = base;
  const to = legs.from === base ? legs.to : legs.from;
  // Below the line: senders of the base (their rate IS the price). Above:
  // senders of the quote (their rate inverts onto this ruler).
  const buyDir = `${from.toUpperCase()}-${to.toUpperCase()}` as Direction;
  const sellDir = `${to.toUpperCase()}-${from.toUpperCase()}` as Direction;
  const selectedSide: 'above' | 'below' =
    direction === sellDir ? 'above' : 'below';

  const near = useDepth(miners, buyDir, base, group);
  const far = useDepth(miners, sellDir, base, group);

  // Running totals outward from the line, both sides already on the ruler.
  const cumulate = (levels: Level[]): Row[] => {
    let total = 0;
    let quote = 0;
    return levels.map((l) => {
      total += l.size;
      quote += l.size * l.price;
      return { price: l.price, size: l.size, total, quote };
    });
  };
  const below = useMemo(() => cumulate(near.levels), [near]);
  const above = useMemo(() => cumulate(far.levels), [far]);

  // Sizes count in the ROW asset — USDC on TAO/USDC, HYPE on TAO/HYPE —
  // whichever way the trade goes: the USDC you'd send one way is the USDC
  // you'd receive the other. That is the asset a taker thinks in, and the
  // unit the matrix already quotes the pair in; the hub's collateral is
  // the plumbing behind it. Levels are held in the base asset; a level's
  // own price converts exactly, and the running total in the quote asset
  // is the same sum the hover shows.
  const sizeOf = (row: Row) => row.size * row.price;
  const totalOf = (row: Row) => row.quote;
  const maxAbove = above.reduce((m, r) => Math.max(m, totalOf(r)), 1);
  const maxBelow = below.reduce((m, r) => Math.max(m, totalOf(r)), 1);

  // Spread the way a book prints it: ask minus bid, as a number and as a
  // percent of their mid (the mid only normalises; it is never shown). Ask
  // is the best level of the quote senders (above), bid the best of the
  // base senders (below). Negative means the book is crossed — the two
  // sides overlap, and a round trip comes out ahead.
  const bid = below[0]?.price ?? null;
  const ask = above[0]?.price ?? null;
  const spreadAbs = bid != null && ask != null ? ask - bid : null;
  const spreadPct =
    spreadAbs != null && bid != null && ask != null && ask + bid > 0
      ? (spreadAbs / ((ask + bid) / 2)) * 100
      : null;
  const crossed = spreadAbs != null && spreadAbs < 0;

  // One decimal count for the whole book, from the finer of the two ticks.
  const tick = Math.min(near.tick || Infinity, far.tick || Infinity);
  const decimals = Number.isFinite(tick) ? tickDecimals(tick) : 5;
  const fmtPrice = (v: number) => v.toFixed(decimals);
  // The picker's steps come from THIS book: the finest tick the quotes are
  // made in, then tens upward, stopping once every side has folded to a
  // single bucket — a step past that changes nothing. The current step is
  // always offered so the control never shows a value it doesn't list.
  const tickScale = near.scale || far.scale || null;
  // Labels are the tick itself, printed plainly — 0.01, 0.1, 1, 10 — the
  // way Binance, Hyperliquid and Coinbase all label this control. On a
  // low-priced book that means small decimals (0.000001), which is also
  // what those venues show for their low-priced markets.
  const fmtTick = (mult: number) => {
    if (tickScale == null) return `×${mult}`;
    const tick = tickScale * mult;
    return tick.toFixed(tickDecimals(tick));
  };
  const groupOptions = useMemo(() => {
    const separates = (mult: number) =>
      (near.bucketsAt[mult] ?? 0) > 1 || (far.bucketsAt[mult] ?? 0) > 1;
    const mults = GROUP_MULTS.filter(
      (mult, i) => i === 0 || separates(GROUP_MULTS[i - 1]) || mult === group,
    );
    return mults;
  }, [near.bucketsAt, far.bucketsAt, group]);
  // With no pick made, the chip shows the step auto-resolution landed on.
  const autoTick = near.tick || far.tick || 0;
  const autoMult =
    tickScale && autoTick ? Math.round(autoTick / tickScale) : null;

  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const tone = { above: move.down, below: move.up } as const;

  const baseUnit = chainSymbol(from);
  const quoteUnit = chainSymbol(to);
  // The column unit: the row asset.
  const unit = quoteUnit;
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
    const pct = (totalOf(row) / max) * 100;
    const color = tone[side];
    const inRange = hover?.side === side && i <= hover.i;
    const isHovered = hover?.side === side && i === hover.i;
    const avg = row.total > 0 ? row.quote / row.total : null;
    // Which direction this side is, and whether its taker sends the base.
    const sideDir = side === 'above' ? sellDir : buyDir;
    const sideSendsBase = side === 'below';
    const cell = (
      <TableRow
        key={`${side}-${row.price}`}
        onMouseEnter={() => setHover({ side, i })}
        onMouseLeave={() => setHover(null)}
        sx={{
          backgroundColor: inRange ? 'action.hover' : 'transparent',
          backgroundImage: `linear-gradient(to right, ${alpha(color, 0.14)} ${pct}%, transparent ${pct}%)`,
          cursor: 'default',
          // The half you picked reads at full strength; the other half sits
          // back, the way its label does on the line. Hovering lifts it.
          opacity: side === selectedSide ? 1 : inRange ? 0.8 : 0.4,
          transition: 'opacity 0.15s',
        }}
      >
        <TableCell sx={{ ...cellSx, color }}>{fmtPrice(row.price)}</TableCell>
        <TableCell
          sx={{ ...cellSx, display: { xs: 'none', sm: 'table-cell' } }}
          align="right"
        >
          {sizeOf(row).toFixed(2)}
        </TableCell>
        <TableCell sx={{ ...cellSx, fontWeight: 600 }} align="right">
          {totalOf(row).toFixed(2)}
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
          <Box sx={{ fontFamily: FONTS.mono, fontSize: '0.66rem' }}>
            <Box sx={{ fontWeight: 700, mb: 0.5 }}>
              {sideLabel(sideDir)} · fill down to {fmtPrice(row.price)}
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'auto auto',
                columnGap: 1.5,
                rowGap: 0.25,
              }}
            >
              <span>You send</span>
              <Box component="span" sx={{ textAlign: 'right' }}>
                {sideSendsBase
                  ? `${row.total.toFixed(2)} ${baseUnit}`
                  : `${row.quote.toFixed(2)} ${quoteUnit}`}
              </Box>
              <span>You get</span>
              <Box component="span" sx={{ textAlign: 'right' }}>
                {sideSendsBase
                  ? `${row.quote.toFixed(2)} ${quoteUnit}`
                  : `${row.total.toFixed(2)} ${baseUnit}`}
              </Box>
              <span>Avg rate</span>
              <Box component="span" sx={{ textAlign: 'right' }}>
                {avg != null ? fmtPrice(avg) : '—'} {quoteUnit}/{baseUnit}
              </Box>
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
                Every open quote for this pair, priced in {quoteUnit} per{' '}
                {baseUnit}. Red rows above the line are miners taking{' '}
                {quoteUnit} and paying {baseUnit}; green rows below take{' '}
                {baseUnit} and pay {quoteUnit}. The best rate on each side sits
                against the line. Size is how much {quoteUnit} that level can
                move; Total adds up the levels from the line down to it. The dot
                marks the direction you picked in the matrix. Hover a row to see
                what filling down to it would send and get.
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
              Group nearby levels into price buckets this wide.
            </Box>
          }
          arrow
          placement="top"
        >
          <Box>
            <MonoSelect<number>
              label="Price grouping"
              value={group ?? autoMult ?? 1}
              onChange={setGroup}
              options={groupOptions.map((mult) => ({
                value: mult,
                label: fmtTick(mult),
              }))}
            />
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
              : emptyRow(sellDir)}

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
                  <Box
                    component="span"
                    sx={{
                      color: tone.above,
                      fontWeight: selectedSide === 'above' ? 700 : 400,
                    }}
                  >
                    ↑ {sideLabel(sellDir)}
                    {selectedSide === 'above' ? ' ●' : ''}
                  </Box>
                  <Tooltip
                    arrow
                    placement="top"
                    title={
                      crossed
                        ? 'Crossed: the best level above pays less than the best level below asks. Out and back at these two comes out ahead.'
                        : 'Best level above minus best level below, and that as a share of their mid.'
                    }
                  >
                    <Box
                      component="span"
                      sx={{
                        color: crossed ? move.up : 'text.primary',
                        cursor: 'help',
                      }}
                    >
                      {crossed ? 'crossed ' : 'spread '}
                      <Box component="span" sx={{ fontWeight: 600 }}>
                        {spreadAbs != null ? fmtPrice(spreadAbs) : '—'}
                      </Box>
                      {spreadPct != null && (
                        <Box
                          component="span"
                          sx={{ color: crossed ? move.up : 'text.secondary' }}
                        >
                          {' '}
                          ({spreadPct.toFixed(2)}%)
                        </Box>
                      )}
                    </Box>
                  </Tooltip>
                  <Box
                    component="span"
                    sx={{
                      color: tone.below,
                      fontWeight: selectedSide === 'below' ? 700 : 400,
                    }}
                  >
                    {selectedSide === 'below' ? '● ' : ''}
                    {sideLabel(buyDir)} ↓
                  </Box>
                </Box>
              </TableCell>
            </TableRow>

            {below.length
              ? below.map((row, i) => renderRow(row, i, 'below', maxBelow))
              : emptyRow(buyDir)}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default OrderbookDepth;
