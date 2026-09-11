import React, { useMemo, useRef, useState } from 'react';
import { Box, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import {
  useChains,
  useCompleteSwapHistory,
  useCrownRateHistoryAll,
  useDirections,
  useUsdPrices,
} from '../../api';
import {
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { takeableSpread, useBestTakeable } from './takeable';
import { COLUMN_LABELS } from './WatchlistSettingsRows';
import { chainInfo, hubChains, hubLeg } from '../../api/models/chains';
import {
  canonicalSource,
  chainName,
  chainSymbol,
  formatRate,
  usdFromHuman,
} from '../../utils/format';
import { hubLegVolume } from './marketRate';
import { FONTS } from '../../theme';
import { ChainLogo } from '../ChainLogo';
import RailTooltip from './railTooltip';
import { MOVE_COLORS, type HeroRange, RANGE_SECS } from './AllwaysMarketRate';
import {
  ALL_HUBS as ALL,
  COLUMNS,
  type Column,
  type Columns,
  type Directions,
} from './watchlistSettings';

// Heading hovers, worded for the window and for whether rows print USD.
const HINTS: Record<Column, (range: string, usd: boolean) => string> = {
  spread: () =>
    'Gap between this route and the way back, as a percent. Negative means they cross.',
  depth: (_, usd) =>
    usd
      ? 'Takeable size behind the quotes right now, estimated in USD.'
      : "Takeable size behind the quotes right now, in the pair's hub asset.",
  vol: (range, usd) =>
    usd
      ? `Value settled on this route over ${range}, estimated in USD.`
      : `Value settled on this route over ${range}, in the pair's hub asset.`,
  swaps: (range) => `Swaps settled on this route over ${range}.`,
  quotes: () => 'Miners quoting this route right now.',
  chg: (range) => `How far this route's rate moved over ${range}.`,
};

// The watchlist, in the shape a TradingView user knows: one row per
// DIRECTION with its symbol, last rate, windowed volume and windowed move.
// Every direction is its own instrument quoted in its natural unit ("1 SOL
// sends 0.00097 BTC"), so a row is that route's crown and how it moved.
// This is the old market page's right rail, now a desk widget; the window
// follows the page's range toggle, so 1W on the chart is 1W here.

// Does either leg of this route settle on `hub`?
const touchesHub = (direction: Direction, hub: string): boolean => {
  const { from, to } = decomposeDirection(direction);
  return from === hub || to === hub;
};
// The one hub a route is FILED under. sol↔tao is reachable from both hubs
// but files under sol, so grouping by this lists every route exactly once.
const anchorHub = (direction: Direction): string | null => {
  const { from, to } = decomposeDirection(direction);
  return hubLeg(from, to);
};

// Compact volume readout: "55.4", "1.2k".
const fmtVol = (v: number) =>
  v >= 1000
    ? `${(v / 1000).toFixed(1)}k`
    : v.toLocaleString(undefined, { maximumFractionDigits: 1 });

// Percent move, held to the width of its column. Test lanes throw out
// things like +3546481.97%; past four digits it switches to compact
// notation (+3.5M%) so the magnitude survives and the layout does not move.
const fmtChg = (chg: number): string => {
  const sign = chg > 0 ? '+' : '';
  if (Math.abs(chg) >= 10000)
    return `${sign}${new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(chg)}%`;
  return `${sign}${chg.toFixed(2)}%`;
};

const labelSx = {
  fontFamily: FONTS.mono,
  fontSize: '0.6rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.secondary',
} as const;

// ONE column definition for the header and every row: separate grids, so
// `auto` tracks would each size to their own content and the headings would
// never sit over their numbers. Symbol takes the slack.
// Symbol takes the slack; each numeric column is sized to its widest
// realistic value. The grid is built from the columns switched on.
const COL_WIDTH: Record<'last' | Column, number> = {
  last: 84,
  spread: 60,
  depth: 64,
  vol: 64,
  swaps: 48,
  quotes: 52,
  chg: 68,
};
const gridFor = (cols: Column[]) =>
  [
    'minmax(0, 1fr)',
    `${COL_WIDTH.last}px`,
    ...cols.map((c) => `${COL_WIDTH[c]}px`),
  ].join(' ');
const GAP = 1;
// The list's cap before it scrolls: about fourteen rows.
const LIST_MAX_PX = 408;

// FX-style instrument label, "SOL/BTC" with the two chain marks slightly
// overlapped like a forex flag pair.
// The network an asset lives on, when that is not the asset's own chain:
// "Ethereum" after UNI and PAXG, "Arbitrum" after one of the four USDCs,
// nothing after BTC or SOL. The same line the sheet prints under a row's
// ticker, shown muted after the ticker so one row reads unambiguously.
const networkOf = (chain: string): string | null => {
  const network = chainInfo(chain)?.network;
  return network && network !== chainName(chain) ? network : null;
};

const ellipsisSx = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

const RouteLabel: React.FC<{ direction: Direction }> = ({ direction }) => {
  const { from, to } = decomposeDirection(direction);
  const network = networkOf(from) ?? networkOf(to);
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
      }}
    >
      <Box
        component="span"
        sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
      >
        <Box
          component="span"
          sx={{ display: 'inline-flex', position: 'relative', zIndex: 1 }}
        >
          <ChainLogo chain={from} size={14} />
        </Box>
        <Box component="span" sx={{ display: 'inline-flex', ml: -0.5 }}>
          <ChainLogo chain={to} size={14} />
        </Box>
      </Box>
      <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
        {chainSymbol(from)}
        <Box component="span" sx={{ color: 'text.disabled' }}>
          /
        </Box>
        {chainSymbol(to)}
      </Box>
      {network && (
        <Box
          component="span"
          sx={{
            ...labelSx,
            fontWeight: 500,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            ...ellipsisSx,
          }}
        >
          {network}
        </Box>
      )}
    </Box>
  );
};

// One row's numbers, computed once for the whole list (so the headings can
// sort on them) and handed to the row.
type Stats = {
  hub: string;
  last: number | null;
  // Spread to the way back on one ruler, percent of mid; negative crosses.
  spread: number | null;
  // Takeable size behind the direction's quotes: USD when every purse is
  // priced, else in hub units.
  depth: number;
  depthUsd: number | null;
  quotes: number;
  vol: number;
  volUsd: number | null;
  swaps: number;
  chg: number | null;
  chgArtifact: boolean;
  seriesLoaded: boolean;
  swapsLoaded: boolean;
};

type SortKey = 'last' | Column;
type Sort = { key: SortKey; dir: 'asc' | 'desc' };

// The rows' numbers: the best takeable rate, spread, depth and quote count
// per route from the miner list, the window's first and last rates from
// one batched series query, and the window's settled volume and swap count
// from one swap-history query, summed per route in a single pass.
const useRowStats = (
  directions: Direction[],
  secs: number,
): Map<Direction, Stats> => {
  const { map: takeable } = useBestTakeable();
  const { data: allSeries } = useCrownRateHistoryAll(secs);
  const { data: swaps } = useCompleteSwapHistory();
  const prices = useUsdPrices();
  return useMemo(() => {
    const cutoff = Date.now() / 1000 - secs;
    const vols = new Map<string, number>();
    const counts = new Map<string, number>();
    for (const s of swaps ?? []) {
      if (
        s.status !== 'COMPLETED' ||
        s.initiatedAt == null ||
        Number(s.initiatedAt) < cutoff
      )
        continue;
      const from = s.sourceChain?.toLowerCase();
      const to = s.destChain?.toLowerCase();
      if (!from || !to) continue;
      const k = `${from}-${to}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
      const v = hubLegVolume(s, canonicalSource(from, to));
      if (!Number.isFinite(v)) continue;
      vols.set(k, (vols.get(k) ?? 0) + v);
    }
    const out = new Map<Direction, Stats>();
    for (const direction of directions) {
      const { from, to } = decomposeDirection(direction);
      const hub = canonicalSource(from, to);
      // Last is the best takeable rate right now (the top of the book);
      // the window's first and last crown rates give the move.
      const quote = takeable.get(direction);
      const live = quote?.rate ?? null;
      const rows = allSeries ? (allSeries[direction] ?? []) : undefined;
      const first = rows?.length
        ? directionalRateFor(direction, rows[0].rate)
        : null;
      const last =
        live ??
        (rows?.length
          ? directionalRateFor(direction, rows[rows.length - 1].rate)
          : null);
      const ratio =
        first != null && first !== 0 && last != null ? last / first : null;
      // A scale-off quote seeding the window produces figures like
      // +1.6e8%: a re-denomination artifact, not a move. Beyond a 10×
      // in-window swing the number is suppressed rather than discredit
      // the whole column.
      const chgArtifact = ratio != null && (ratio > 10 || ratio < 0.1);
      const chg = ratio != null && !chgArtifact ? (ratio - 1) * 100 : null;
      // Depth: every purse's takeable collateral, in USD when each purse
      // is priced (they are summed only then), else in hub units.
      let depth = 0;
      let depthUsd: number | null = 0;
      for (const [backing, units] of Object.entries(quote?.depth ?? {})) {
        depth += units;
        const usd = usdFromHuman(units, backing, prices);
        depthUsd = depthUsd != null && usd != null ? depthUsd + usd : null;
      }
      const vol = vols.get(`${from}-${to}`) ?? 0;
      out.set(direction, {
        hub,
        last,
        spread: takeableSpread(takeable, direction),
        depth,
        depthUsd,
        quotes: quote?.quotes ?? 0,
        vol,
        volUsd: usdFromHuman(vol, hub, prices),
        swaps: counts.get(`${from}-${to}`) ?? 0,
        chg,
        chgArtifact,
        seriesLoaded: rows !== undefined,
        swapsLoaded: swaps !== undefined,
      });
    }
    return out;
  }, [directions, secs, takeable, allSeries, swaps, prices]);
};

// The number a column sorts on; null sorts last either way.
const sortValue = (s: Stats, key: SortKey): number | null => {
  switch (key) {
    case 'last':
      return s.last;
    case 'spread':
      return s.spread;
    case 'depth':
      return s.depthUsd ?? s.depth;
    case 'vol':
      return s.volUsd ?? s.vol;
    case 'swaps':
      return s.swaps;
    case 'quotes':
      return s.quotes;
    case 'chg':
      return s.chg;
  }
};

const Row: React.FC<{
  direction: Direction;
  selected: boolean;
  starred: boolean;
  stats: Stats;
  cols: Column[];
  onSelect: (direction: Direction) => void;
  onToggleFavorite: (direction: Direction) => void;
}> = ({
  direction,
  selected,
  starred,
  stats,
  cols,
  onSelect,
  onToggleFavorite,
}) => {
  const theme = useTheme();
  const {
    hub,
    last,
    spread,
    depth,
    depthUsd,
    quotes,
    vol,
    volUsd,
    swaps,
    chg,
    chgArtifact,
    seriesLoaded,
    swapsLoaded,
  } = stats;
  // Nothing traded and nothing moved in the window: keep the row, let the
  // live markets pop. The selected row is never dimmed.
  const dormant = !selected && vol === 0 && (chg == null || chg === 0);

  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const chgColor =
    chg == null || chg === 0
      ? theme.palette.text.secondary
      : chg > 0
        ? move.up
        : move.down;

  const skeleton = (width: number) => (
    <Skeleton
      variant="text"
      width={width}
      sx={{ borderRadius: 0, display: 'inline-block' }}
    />
  );
  const numSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.66rem',
    fontWeight: 500,
    color: 'text.secondary',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  } as const;
  // One cell per switched-on column.
  const cell = (c: Column): React.ReactNode => {
    switch (c) {
      case 'spread':
        return (
          <Typography
            key={c}
            title={
              spread == null
                ? 'Only one side is quoted'
                : spread < 0
                  ? 'Crossed: the two sides overlap'
                  : undefined
            }
            sx={{
              ...numSx,
              color: spread != null && spread < 0 ? move.up : 'text.secondary',
            }}
          >
            {spread != null ? fmtChg(spread).replace(/^\+/, '') : '—'}
          </Typography>
        );
      case 'depth':
        return (
          <Typography
            key={c}
            title={
              depthUsd != null
                ? `${fmtVol(depth)} ${chainSymbol(hub)}`
                : undefined
            }
            sx={numSx}
          >
            {depthUsd != null ? `$${fmtVol(depthUsd)}` : fmtVol(depth)}
          </Typography>
        );
      case 'vol':
        return (
          <Typography
            key={c}
            title={
              volUsd != null ? `${fmtVol(vol)} ${chainSymbol(hub)}` : undefined
            }
            sx={numSx}
          >
            {!swapsLoaded
              ? skeleton(28)
              : volUsd != null
                ? `$${fmtVol(volUsd)}`
                : fmtVol(vol)}
          </Typography>
        );
      case 'swaps':
        return (
          <Typography key={c} sx={numSx}>
            {!swapsLoaded ? skeleton(20) : swaps}
          </Typography>
        );
      case 'quotes':
        return (
          <Typography key={c} sx={numSx}>
            {quotes}
          </Typography>
        );
      case 'chg':
        return (
          <Typography
            key={c}
            title={
              chgArtifact
                ? 'rate scale changed inside this window; % change not meaningful'
                : undefined
            }
            sx={{
              ...numSx,
              fontWeight: 600,
              color: chgArtifact ? 'text.disabled' : chgColor,
            }}
          >
            {chg != null ? fmtChg(chg) : chgArtifact ? '—' : ''}
          </Typography>
        );
    }
  };

  return (
    <Box
      component="button"
      type="button"
      data-dir={direction}
      onClick={(e) => {
        // Safari does not focus a clicked button; the arrow keys need it.
        e.currentTarget.focus({ preventScroll: true });
        onSelect(direction);
      }}
      aria-pressed={selected}
      sx={{
        all: 'unset',
        width: '100%',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: gridFor(cols),
        alignItems: 'center',
        columnGap: GAP,
        px: 1.5,
        py: 0.75,
        borderLeft: '2px solid transparent',
        // The picked row reads like the sheet's active cell: a full ring
        // in the text colour, drawn with outline so it never moves the
        // row, inset so the scroller does not clip it.
        outline: selected ? '2px solid' : undefined,
        outlineColor: selected ? 'text.primary' : undefined,
        outlineOffset: -2,
        backgroundColor: selected ? 'action.hover' : 'transparent',
        opacity: dormant ? 0.55 : 1,
        transition: 'opacity 0.15s',
        '&:hover': { backgroundColor: 'action.hover', opacity: 1 },
        '&:hover .watch-star': { opacity: 1 },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          fontFamily: FONTS.mono,
          fontSize: '0.72rem',
          fontWeight: 600,
          color: 'text.primary',
          minWidth: 0,
          overflow: 'hidden',
          pr: 2.5,
        }}
      >
        <RouteLabel direction={direction} />
        {/* The star, as on the sheet's rows: shown on hover, kept when
            on. A span with a button role, since the row is a button. */}
        <Box
          component="span"
          role="button"
          tabIndex={0}
          className="watch-star"
          aria-label={starred ? 'Unstar' : 'Star'}
          aria-pressed={starred}
          title={starred ? 'unstar' : 'star'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(direction);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(direction);
            }
          }}
          sx={{
            position: 'absolute',
            right: 4,
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            // The sheet's star: the site font, not the row's mono, whose
            // ★ is narrower.
            fontFamily: FONTS.body,
            fontSize: 12,
            lineHeight: 1,
            opacity: starred ? 1 : 0,
            color: starred ? '#e8b923' : 'border.light',
            '&:hover': { color: starred ? '#e8b923' : 'text.secondary' },
          }}
        >
          ★
        </Box>
      </Box>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.72rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {!seriesLoaded && last == null
          ? skeleton(48)
          : last != null
            ? formatRate(last)
            : '—'}
      </Typography>
      {cols.map(cell)}
    </Box>
  );
};

/**
 * The Watchlist desk widget: column headings and every route as a row
 * filed under the hub that settles it (or one hub's network, from the
 * widget's settings). Clicking a row switches the page's instrument. Fills
 * its widget and scrolls inside.
 */
const Watchlist: React.FC<{
  direction: Direction;
  range: HeroRange;
  /** Hub scope from the widget's settings: ALL_HUBS or a hub id. */
  scope: string;
  /** Both directions of a pair, or only the one from / to its hub. */
  directions: Directions;
  /** Which optional columns show (the widget's settings). */
  columns: Columns;
  /** Starred routes, and whether only they show. */
  favorites: string[];
  favoritesOnly: boolean;
  onToggleFavorite: (direction: Direction) => void;
  onDirectionChange: (direction: Direction, hub: string) => void;
}> = ({
  direction,
  range,
  scope,
  directions: which,
  columns,
  favorites,
  favoritesOnly,
  onToggleFavorite,
  onDirectionChange,
}) => {
  const cols = useMemo(() => COLUMNS.filter((c) => columns[c]), [columns]);
  const secs = RANGE_SECS[range];
  // Every registry pair with a hub leg. A deep link must never lose its
  // market, so the selected route stays listed even if the registry has
  // not (yet) served its pair.
  const all = useDirections();
  const directions = useMemo<Direction[]>(
    () => (all.includes(direction) ? all : [direction, ...all]),
    [all, direction],
  );
  const { data: chains } = useChains();
  const hubs = useMemo(() => hubChains(chains), [chains]);
  const stats = useRowStats(directions, secs);

  // A heading click sorts its column, high to low; again, low to high;
  // again, back to the registry's order. One list, one order: the routes
  // are not sectioned by hub, so a sort by volume ranks every route on
  // the desk against every other.
  const [sort, setSort] = useState<Sort | null>(null);
  const sortBy = (key: SortKey) =>
    setSort((cur) =>
      cur?.key !== key
        ? { key, dir: 'desc' }
        : cur.dir === 'desc'
          ? { key, dir: 'asc' }
          : null,
    );
  const order = (rows: Direction[]): Direction[] => {
    if (!sort) return rows;
    const sign = sort.dir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const sa = stats.get(a);
      const sb = stats.get(b);
      const x = sa ? sortValue(sa, sort.key) : null;
      const y = sb ? sortValue(sb, sort.key) : null;
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return sign * (x - y);
    });
  };

  // "All" lists every route once, under its anchor hub in registry hub
  // order; a hub scope is that hub's whole network, including the routes
  // it merely touches (sol↔tao files under sol but rides on both). 'from'
  // keeps the routes a hub sends on and 'to' the routes that arrive at it,
  // so each pair appears once.
  const rows = useMemo(() => {
    const oneWay = (list: Direction[], hub: string) =>
      which === 'both'
        ? list
        : list.filter(
            (d) =>
              decomposeDirection(d)[which === 'from' ? 'from' : 'to'] === hub,
          );
    const listed =
      scope === ALL
        ? hubs.flatMap((h) =>
            oneWay(
              directions.filter((d) => anchorHub(d) === h),
              h,
            ),
          )
        : oneWay(
            directions.filter((d) => touchesHub(d, scope)),
            scope,
          );
    // Favorites only: the starred routes and nothing else.
    return favoritesOnly ? listed.filter((d) => favorites.includes(d)) : listed;
  }, [scope, which, hubs, directions, favorites, favoritesOnly]);

  // Vol column wording follows whether rows can render USD.
  const prices = useUsdPrices();
  const usdMode = hubs.every((h) => typeof prices[h] === 'number');

  const select = (d: Direction) => {
    const legs = decomposeDirection(d);
    onDirectionChange(d, hubLeg(legs.from, legs.to) ?? legs.from);
  };

  // The rows as they are on screen (scoped, one-way, starred, sorted).
  const ordered = useMemo(() => order(rows), [rows, sort, stats]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrow keys walk the list: with the list focused (clicking a row
  // focuses it), ↓ and ↑ pick the next and previous row in the order on
  // screen, and keep the picked row in view.
  const listRef = useRef<HTMLDivElement>(null);
  const focusRow = (d: Direction) => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `button[data-dir="${d}"]`,
    );
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: 'nearest' });
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if (!ordered.length) return;
    const at = ordered.indexOf(direction);
    const next =
      at < 0
        ? 0
        : Math.min(
            ordered.length - 1,
            Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)),
          );
    e.preventDefault();
    const d = ordered[next];
    if (d !== direction) select(d);
    // The row is already in the DOM; focus it now rather than after the
    // page's URL round-trip.
    focusRow(d);
  };

  return (
    <Stack sx={{ minHeight: 0, minWidth: 0 }}>
      {/* Column headings, each with a plain-language hover. Same grid as
          the rows (including the 2px selection border) so the labels sit
          flush over their columns. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: gridFor(cols),
          columnGap: GAP,
          mx: -1.5,
          px: 1.5,
          pb: 0.75,
          borderLeft: '2px solid transparent',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <RailTooltip
          placement="bottom"
          title="What you send, and what arrives. Each direction is its own market, with its own miners and rate."
        >
          <Typography sx={labelSx}>Symbol</Typography>
        </RailTooltip>
        {(
          [
            ['last', 'Last', 'Best rate right now: what 1 unit sent delivers.'],
            ...cols.map((c): [SortKey, string, string] => [
              c,
              COLUMN_LABELS[c].label,
              HINTS[c](range, usdMode),
            ]),
          ] as [SortKey, string, string][]
        ).map(([key, label, hint]) => {
          const on = sort?.key === key;
          return (
            <RailTooltip
              key={key}
              placement="bottom"
              title={`${hint} Click to sort.`}
            >
              <Box
                component="button"
                type="button"
                onClick={() => sortBy(key)}
                aria-sort={
                  on
                    ? sort.dir === 'desc'
                      ? 'descending'
                      : 'ascending'
                    : 'none'
                }
                sx={{
                  all: 'unset',
                  ...labelSx,
                  cursor: 'pointer',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  color: on ? 'text.primary' : 'text.secondary',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {label}
                {on && (sort.dir === 'desc' ? ' ▼' : ' ▲')}
              </Box>
            </RailTooltip>
          );
        })}
      </Box>

      {/* The list is as tall as its rows, up to a cap, then scrolls; the
          widget follows it, so two starred routes make a short widget and
          the full registry a tall one with a scrollbar, never dead space.
          Rows bleed to the widget's edges like the search results do. */}
      <Box
        ref={listRef}
        onKeyDown={onKeyDown}
        sx={{
          maxHeight: LIST_MAX_PX,
          minHeight: 0,
          overflowY: 'auto',
          mx: -1.5,
          mb: -1.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: (t) => t.palette.border.light,
            borderRadius: 0,
          },
        }}
      >
        {ordered.map((d) => {
          const st = stats.get(d);
          return st ? (
            <Row
              key={d}
              direction={d}
              selected={d === direction}
              starred={favorites.includes(d)}
              stats={st}
              cols={cols}
              onSelect={select}
              onToggleFavorite={onToggleFavorite}
            />
          ) : null;
        })}
      </Box>
    </Stack>
  );
};

export default Watchlist;
