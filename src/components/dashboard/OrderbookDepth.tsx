import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  minerServesPair,
  useCurrentCrown,
  useMiners,
  type Miner,
} from '../../api';
import {
  crownLaneFor,
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { alpha } from '@mui/material/styles';
import { FONTS } from '../../theme';
import { chainSymbol, formatRate, unitsToHuman } from '../../utils/format';
import { chainInfo, chainList } from '../../api/models/chains';
import { OrderbookDepthSkeleton } from './Skeletons';
import MonoSelect from '../MonoSelect';
import RailTooltip from './railTooltip';
import DepthChart from './DepthChart';
import { MOVE_COLORS } from './AllwaysMarketRate';
import { FLASH_ANIMATION } from './flash';

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

// A hint as short keyed lines, not a paragraph: label on the left, one
// clause on the right.
const HintLines: React.FC<{ lines: [string, string][] }> = ({ lines }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      columnGap: 1,
      rowGap: 0.25,
      fontFamily: FONTS.mono,
    }}
  >
    {lines.map(([k, v]) => (
      <React.Fragment key={k}>
        <Box component="span" sx={{ opacity: 0.7, whiteSpace: 'nowrap' }}>
          {k}
        </Box>
        <span>{v}</span>
      </React.Fragment>
    ))}
  </Box>
);

// The caption over one side of the book: a legend swatch in the side's
// chart colour, the side's direction as a chip in the site's treatment (see
// RangeChips), and its best rate beside it.
// The picked side is inverted paper-on-text. With a setter, the chip is the
// toggle between the two directions.
const SideHeading: React.FC<{
  label: string;
  // The side's colour on the chart, shown as a legend swatch by the chip.
  color: string;
  // The side's best rate, e.g. "0.041680"; absent when the side is empty.
  best?: string | null;
  // Bumps when the best rate moves; a fresh key restarts its flash.
  bestSeq?: number;
  selected: boolean;
  onSelect?: () => void;
  align: 'left' | 'right';
}> = ({ label, color, best, bestSeq = 0, selected, onSelect, align }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      flexDirection: align === 'left' ? 'row' : 'row-reverse',
      gap: 1.5,
      minWidth: 0,
      px: 1,
      py: 0.75,
    }}
  >
    <Box
      component="span"
      aria-hidden
      sx={{
        flex: 'none',
        width: 8,
        height: 8,
        backgroundColor: color,
        mr: align === 'left' ? -0.5 : 0,
        ml: align === 'right' ? -0.5 : 0,
      }}
    />
    <RailTooltip
      title={onSelect && !selected ? `Show ${label}` : ''}
      placement="top"
    >
      <Box
        component={onSelect ? 'button' : 'span'}
        onClick={onSelect}
        aria-pressed={onSelect ? selected : undefined}
        sx={{
          all: 'unset',
          cursor: onSelect ? 'pointer' : 'default',
          display: 'inline-block',
          minWidth: 0,
          boxSizing: 'border-box',
          px: 1,
          py: 0.4,
          fontFamily: FONTS.mono,
          fontSize: '0.65rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: selected ? 'background.paper' : 'text.secondary',
          backgroundColor: selected ? 'text.primary' : 'transparent',
          '&:hover': onSelect
            ? { backgroundColor: selected ? 'text.primary' : 'action.hover' }
            : undefined,
        }}
      >
        {label}
      </Box>
    </RailTooltip>
    {best && (
      <Box
        component="span"
        key={bestSeq}
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.82rem',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: selected ? 'text.primary' : 'text.secondary',
          whiteSpace: 'nowrap',
          px: 0.5,
          mx: -0.5,
          '--flash': alpha(color, 0.28),
          ...(bestSeq > 0 ? { animation: FLASH_ANIMATION } : {}),
        }}
      >
        {best}
      </Box>
    )}
  </Box>
);

interface Row {
  price: number;
  size: number;
  total: number;
  // Cumulative value of the levels up to this one, in the received asset
  // (size × price summed), for the hover's average and sums.
  quote: number;
}

// The pair's book as an FX ladder: two columns, one per direction, both
// priced in the selected direction's unit (the other direction's levels
// inverted onto it, sized in the same asset), best rates at the top of
// each column against the centre rule. Neither side is a buy or a sell —
// each is its own instrument, a conversion the taker sends from — so the
// depth bars share one neutral tint and nothing is netted across the rule.
const OrderbookDepth: React.FC<{
  // The selected direction — decides which side of the line is "yours".
  direction: Direction;
  // The hub the book is priced against: prices are the other asset per 1
  // of this, exactly the matrix's unit, so the cell you clicked is a level
  // on this ladder.
  base: string;
  // Given, the side headings become the toggle between the two directions.
  onDirectionChange?: (direction: Direction, hub: string) => void;
}> = ({ direction, base, onDirectionChange }) => {
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

  // A change counter per level (and per side's best), so a level whose
  // size or total moved flashes once, the way a moved rate does in the
  // matrix. The first fill doesn't flash; only a change after it does.
  const prevLevels = useRef<Record<string, string> | null>(null);
  const [seq, setSeq] = useState<Record<string, number>>({});
  useEffect(() => {
    const now: Record<string, string> = {};
    for (const [side, rows] of [
      ['below', below],
      ['above', above],
    ] as const) {
      for (const r of rows) now[`${side}|${r.price}`] = `${r.size}|${r.total}`;
      if (rows[0]) now[`${side}|best`] = String(rows[0].price);
    }
    const before = prevLevels.current;
    prevLevels.current = now;
    if (!before) return;
    const bumped = Object.keys(now).filter(
      (k) => k in before && before[k] !== now[k],
    );
    if (!bumped.length) return;
    setSeq((s) => {
      const n = { ...s };
      for (const k of bumped) n[k] = (n[k] ?? 0) + 1;
      return n;
    });
  }, [below, above]);

  // Depth counts in the ROW asset — USDC on TAO/USDC, HYPE on TAO/HYPE —
  // whichever way the trade goes: the USDC you'd send one way is the USDC
  // you'd receive the other. That is the asset a taker thinks in, and the
  // unit the matrix already quotes the pair in; the hub's collateral is
  // the plumbing behind it. Levels are held in the base asset; each one's
  // own price converts exactly, and the running total in the quote asset
  // is the same sum the hover shows.
  const sizeOf = (row: Row) => row.size * row.price;
  const totalOf = (row: Row) => row.quote;
  // Each side's full depth, the width of its longest bar. No floor: a BTC
  // book's whole depth can be 0.0025, and a floor of 1 would flatten it.
  const maxAbove = above.reduce((m, r) => Math.max(m, totalOf(r)), 0) || 1;
  const maxBelow = below.reduce((m, r) => Math.max(m, totalOf(r)), 0) || 1;

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
  const fmtPrice = useCallback((v: number) => v.toFixed(decimals), [decimals]);
  // Amounts (sizes, totals, the chart's axis): two decimals is right for
  // USDC or TAO, but a BTC book's whole depth can be 0.0025, so below 1
  // keep three significant digits instead of rounding a real level to 0.
  const fmtAmount = useCallback((v: number) => {
    if (!Number.isFinite(v) || v === 0) return '0.00';
    if (v >= 100) return v.toFixed(0);
    if (v >= 1) return v.toFixed(2);
    const decimals = Math.min(8, Math.max(2, 2 - Math.floor(Math.log10(v))));
    return v.toFixed(decimals);
  }, []);
  const fmtTotal = fmtAmount;
  // The picker's steps come from THIS book: the finest tick the quotes are
  // made in, then tens upward, stopping once every side has folded to a
  // single bucket — a step past that changes nothing. The current step is
  // always offered so the control never shows a value it doesn't list.
  // With no levels on either side, the picker still needs a scale: take it
  // from the crown rate, on the same ruler.
  const { data: crown } = useCurrentCrown();
  const crownBuy = directionalRateFor(
    buyDir,
    crownLaneFor(crown, buyDir, base)?.rate,
  );
  const crownSellNatural = directionalRateFor(
    sellDir,
    crownLaneFor(crown, sellDir, base)?.rate,
  );
  const crownPrice =
    crownBuy ??
    (crownSellNatural && crownSellNatural > 0 ? 1 / crownSellNatural : null);
  const tickScale =
    near.scale || far.scale || (crownPrice ? tickBase(crownPrice) : null);
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

  const baseUnit = chainSymbol(from);
  const quoteUnit = chainSymbol(to);
  // The column unit: the row asset.
  const unit = quoteUnit;
  const priceUnit = `${quoteUnit}/${baseUnit}`;
  // "USDC (Solana) → SOL": tickers, with the network added only where the
  // same ticker is listed on more than one network.
  const assetLabel = (id: string) => {
    const c = chainInfo(id);
    if (!c) return id.toUpperCase();
    const shared = chainList().some(
      (o) => o.id !== c.id && o.symbol === c.symbol,
    );
    return shared && c.network ? `${c.symbol} (${c.network})` : c.symbol;
  };
  const sideLabel = (d: Direction) => {
    const l = decomposeDirection(d);
    return `${assetLabel(l.from)} → ${assetLabel(l.to)}`;
  };
  const pick = (d: Direction) =>
    onDirectionChange ? () => onDirectionChange(d, base) : undefined;

  const headerSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.62rem',
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    // Labels never wrap: a wrapped label would push that column's rows
    // out of line with the other's.
    '& > span': {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      minWidth: 0,
    },
  };

  // One book row: Price, Size, Total, in that order on both sides, the
  // way every exchange prints a book. Size hides below sm. Rows are the
  // same height in both columns so the two books line up row for row.
  const levelRowSx = {
    display: 'grid',
    gridTemplateColumns: {
      xs: 'minmax(0, 1.2fr) minmax(0, 1fr)',
      sm: 'minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr)',
    },
    alignItems: 'center',
    columnGap: 1,
    px: 1,
    minHeight: 28,
    borderBottom: `1px solid ${theme.palette.divider}`,
  } as const;
  const levelCellSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.72rem',
    fontVariantNumeric: 'tabular-nums' as const,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
  };

  // What filling down to a level sends and gets, for the chart's tooltip
  // and the ladder's.
  const fillLines = (row: Row, side: 'above' | 'below'): [string, string][] => {
    const sideSendsBase = side === 'below';
    const avg = row.total > 0 ? row.quote / row.total : null;
    return [
      [
        'You send',
        sideSendsBase
          ? `${fmtAmount(row.total)} ${baseUnit}`
          : `${fmtAmount(row.quote)} ${quoteUnit}`,
      ],
      [
        'You get',
        sideSendsBase
          ? `${fmtAmount(row.quote)} ${quoteUnit}`
          : `${fmtAmount(row.total)} ${baseUnit}`,
      ],
      [
        'Avg rate',
        `${avg != null ? fmtPrice(avg) : '—'} ${quoteUnit}/${baseUnit}`,
      ],
    ];
  };
  const depthLevels = (rows: Row[], side: 'above' | 'below') =>
    rows.map((row) => ({
      price: row.price,
      total: totalOf(row),
      lines: fillLines(row, side),
    }));
  const leftDepth = useMemo(
    () => depthLevels(below, 'below'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [below, baseUnit, quoteUnit, decimals],
  );
  const rightDepth = useMemo(
    () => depthLevels(above, 'above'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [above, baseUnit, quoteUnit, decimals],
  );

  // One ladder level. Hovering lights every level between the best and it,
  // the ones a fill down to it would take, and points the chart's tooltip
  // at it. The chart carries the depth; the rows stay plain.
  const renderRow = (
    row: Row,
    i: number,
    side: 'above' | 'below',
    max: number,
  ) => {
    const col: 'left' | 'right' = side === 'below' ? 'left' : 'right';
    const color = colorOf(col);
    const inRange = hover?.side === side && i <= hover.i;
    // The depth bar: this level's running total as a share of the side's
    // whole, drawn from the centre rule outward like the chart above. It is
    // the only colour on the row, and faint; the text stays in ink.
    const pct = (totalOf(row) / max) * 100;
    const bump = seq[`${side}|${row.price}`] ?? 0;
    return (
      <Box
        key={`${side}-${row.price}-${bump}`}
        onMouseEnter={() => setHover({ side, i })}
        onMouseLeave={() => setHover(null)}
        sx={{
          ...levelRowSx,
          '--flash': alpha(color, 0.28),
          ...(bump > 0 ? { animation: FLASH_ANIMATION } : {}),
          backgroundColor: inRange ? 'action.hover' : 'transparent',
          backgroundImage: `linear-gradient(to ${col}, ${alpha(color, inRange ? 0.16 : 0.08)} ${pct}%, transparent ${pct}%)`,
          cursor: 'default',
        }}
      >
        <Box component="span" sx={levelCellSx}>
          {fmtPrice(row.price)}
        </Box>
        <Box
          component="span"
          sx={{
            ...levelCellSx,
            display: { xs: 'none', sm: 'block' },
            textAlign: 'right',
          }}
        >
          {fmtAmount(sizeOf(row))}
        </Box>
        <Box
          component="span"
          sx={{ ...levelCellSx, textAlign: 'right', fontWeight: 600 }}
        >
          {fmtAmount(totalOf(row))}
        </Box>
      </Box>
    );
  };

  const emptyColumn = (side: Direction) => (
    <Box
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.68rem',
        textAlign: 'center',
        px: 1.5,
        py: 2,
        color: 'text.secondary',
      }}
    >
      {(side === buyDir ? crownBuy : crownSellNatural) != null ? (
        <>
          The validator scores a crown at{' '}
          {formatRate(
            side === buyDir
              ? (crownBuy as number)
              : (crownSellNatural as number),
          )}
          , but no takeable quote is indexed for it yet
        </>
      ) : (
        <>No open liquidity for {sideLabel(side)}</>
      )}
    </Box>
  );

  // The book's column labels, the same on both sides.
  const columnLabels = () => (
    <Box sx={{ ...levelRowSx, ...headerSx }}>
      <Box component="span">Price</Box>
      <Box
        component="span"
        sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}
      >
        Size
      </Box>
      <Box component="span" sx={{ textAlign: 'right' }}>
        Total
      </Box>
    </Box>
  );

  // The exchange colours, on the exchange's sides: green on the left, where
  // you send the base asset (bids take it), red on the right, where you
  // send the quote for it (asks). The words stay directional.
  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const colorOf = (col: 'left' | 'right') =>
    col === 'left' ? move.up : move.down;
  const sideOf = (col: 'left' | 'right') =>
    col === 'left' ? ('below' as const) : ('above' as const);
  const dirOf = (col: 'left' | 'right') => (col === 'left' ? buyDir : sellDir);
  const columnSx = (col: 'left' | 'right') =>
    ({
      minWidth: 0,
      borderLeft: col === 'right' ? '1px solid' : 'none',
      borderColor: 'divider',
    }) as const;

  // The side's best level, for the heading.
  const sideBest = (col: 'left' | 'right'): string | null => {
    const rows = col === 'left' ? below : above;
    return rows.length ? fmtPrice(rows[0].price) : null;
  };
  const heading = (col: 'left' | 'right') => (
    <Box key={`${col}-heading`} sx={columnSx(col)}>
      <SideHeading
        label={sideLabel(dirOf(col))}
        color={colorOf(col)}
        best={sideBest(col)}
        bestSeq={seq[`${sideOf(col)}|best`] ?? 0}
        selected={selectedSide === sideOf(col)}
        onSelect={pick(dirOf(col))}
        align={col}
      />
    </Box>
  );
  const ladder = (col: 'left' | 'right') => {
    const side = sideOf(col);
    const rows = side === 'below' ? below : above;
    const max = side === 'below' ? maxBelow : maxAbove;
    return (
      <Box key={`${col}-ladder`} sx={columnSx(col)}>
        {columnLabels()}
        {rows.length
          ? rows.map((row, i) => renderRow(row, i, side, max))
          : emptyColumn(dirOf(col))}
      </Box>
    );
  };

  const twoColumns = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    alignItems: 'start',
  } as const;

  // The chart's inputs, stable between renders so a hover does not rebuild
  // the chart (which would drop the tooltip it is meant to show).
  const leftName = sideLabel(buyDir);
  const rightName = sideLabel(sellDir);
  const leftSide = useMemo(
    () => ({ name: leftName, color: move.up, levels: leftDepth }),
    [leftName, move.up, leftDepth],
  );
  const rightSide = useMemo(
    () => ({ name: rightName, color: move.down, levels: rightDepth }),
    [rightName, move.down, rightDepth],
  );
  const spreadBand = useMemo(
    () =>
      bid != null && ask != null && spreadAbs != null
        ? {
            a: bid,
            b: ask,
            crossed,
            color: null,
          }
        : null,
    [bid, ask, spreadAbs, crossed],
  );
  const chartHover = useMemo(
    () =>
      hover
        ? {
            side:
              hover.side === 'below' ? ('left' as const) : ('right' as const),
            index: hover.i,
          }
        : null,
    [hover],
  );
  const onChartHover = useCallback(
    (h: { side: 'left' | 'right'; index: number } | null) =>
      setHover(
        h ? { side: h.side === 'left' ? 'below' : 'above', i: h.index } : null,
      ),
    [],
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
          gap: 1,
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
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.62rem',
              color: 'text.secondary',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
          >
            · prices in {priceUnit}, sizes in {unit}
          </Typography>
          <RailTooltip
            placement="right"
            componentsProps={{ tooltip: { sx: { maxWidth: 320 } } }}
            title={
              <HintLines
                lines={[
                  ['Left', `send ${baseUnit}, get ${quoteUnit}`],
                  ['Right', `send ${quoteUnit}, get ${baseUnit}`],
                  [
                    'Price',
                    `${quoteUnit} per ${baseUnit}, best beside each side`,
                  ],
                  ['Chart', `${unit} available at or better than each price`],
                  ['Spread', 'gap between the two best prices'],
                  ['Crossed', 'the two sides overlap'],
                  ['Click', 'a direction to switch to it'],
                  ['Hover', 'a level to see what it sends and gets'],
                ]}
              />
            }
          >
            <IconButton size="small" sx={{ p: 0, color: 'text.secondary' }}>
              <InfoOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </RailTooltip>
        </Box>
        {/* Precision picker: the tick sizes themselves, like an exchange's. */}
        <RailTooltip
          title="Group levels into price buckets this wide."
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
        </RailTooltip>
      </Box>

      {/* Headings, then the depth chart across both sides, then the ladder. */}
      <Box
        sx={{ ...twoColumns, borderTop: '1px solid', borderColor: 'divider' }}
      >
        {heading('left')}
        {heading('right')}
      </Box>
      {/* What the chart shows, in words, with the spread beside it. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'baseline',
          gap: 1,
          px: 1,
          pt: 1.25,
          pb: 0.25,
          fontFamily: FONTS.mono,
        }}
      >
        <Box
          component="span"
          sx={{
            fontSize: '0.62rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            whiteSpace: 'nowrap',
          }}
        >
          Market depth
        </Box>
        {spreadAbs != null && spreadPct != null ? (
          <RailTooltip
            placement="top"
            title={
              crossed
                ? 'The two best prices overlap by this much.'
                : 'Gap between the two best prices, and as a share of their mid.'
            }
          >
            <Box
              component="span"
              sx={{
                justifySelf: 'center',
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 0.75,
                cursor: 'help',
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: '0.58rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  // Crossed is the one word that changes; it reads in ink.
                  color: crossed ? 'text.primary' : 'text.secondary',
                  fontWeight: crossed ? 700 : 400,
                }}
              >
                {crossed ? 'Crossed' : 'Spread'}
              </Box>
              <Box
                component="span"
                sx={{ fontSize: '0.74rem', fontWeight: 700 }}
              >
                {fmtPrice(Math.abs(spreadAbs))}
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: '0.66rem',
                  color: 'text.secondary',
                }}
              >
                {Math.abs(spreadPct).toFixed(2)}%
              </Box>
            </Box>
          </RailTooltip>
        ) : (
          <span />
        )}
        <span />
      </Box>
      <DepthChart
        left={leftSide}
        right={rightSide}
        selected={selectedSide === 'below' ? 'left' : 'right'}
        spread={spreadBand}
        formatPrice={fmtPrice}
        formatTotal={fmtTotal}
        hover={chartHover}
        onHover={onChartHover}
        height={170}
      />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          borderTop: '1px solid',
          borderColor: 'divider',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.border.light,
            borderRadius: 0,
          },
        }}
      >
        <Box sx={twoColumns}>
          {ladder('left')}
          {ladder('right')}
        </Box>
      </Box>
    </Box>
  );
};

export default OrderbookDepth;
