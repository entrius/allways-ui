import React, { useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useChains, useCrownRateHistory, useCurrentCrown } from '../../api';
import {
  crownLaneFor,
  decomposeDirection,
  directionalRateFor,
  type Direction,
  lanesFor,
} from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import { chainName, chainSymbol, formatRate } from '../../utils/format';
import { ChainLogo, TickerSymbol } from '../ChainLogo';
import RangeChips from '../RangeChips';
import { TimeSeriesChart, type ChartSeries } from '../stats';
import StatsStrip from './StatsStrip';
import SymbolSearch from './SymbolSearch';
import { hubLeg } from '../../api/models/chains';

// The non-anchor side of a pair. A string, not a union: pairs are open-ended —
// every chain in the das registry gets its markets automatically.
export type Spoke = string;

// Semantic move colors (up green / down red), shared with the pairs rail's
// change column. Light mode mirrors index.css --color-success/--color-danger;
// dark mode brightens both so they read against near-black.
// warn = the no-fault terminal outcome (CANCELLED): canvas charts can't
// resolve CSS vars, so this is the hex twin of --color-warning per mode.
export const MOVE_COLORS = {
  light: { up: '#15803d', down: '#b91c1c', warn: '#b45309' },
  dark: { up: '#4ade80', down: '#f87171', warn: '#fbbf24' },
} as const;

// Robinhood-style range chips. The rate-history endpoint reads through a 1y
// cap (downsampled ≤1500 points), so 1M is bounded only by what exists: the
// alw-utils prune cron keeps ~35d of crown_holders, and a young network shows
// however much has accumulated. ALL can follow once retention grows past 1M.
export type HeroRange = '1H' | '1D' | '1W' | '1M';
const RANGES: HeroRange[] = ['1H', '1D', '1W', '1M'];
export const RANGE_SECS: Record<HeroRange, number> = {
  '1H': 3_600,
  '1D': 86_400,
  '1W': 604_800,
  '1M': 2_592_000,
};

// Directional {t(ms), value} points for one leg's crown history. Rows are
// interval STARTS (the rate holds until the next row), so the series is
// extended to "now" — otherwise the line would stop at the last change. The
// extension uses the LIVE crown rate when available, not the last history
// row: history recording can lag behind the live crown, and flat-extending a
// stale sample would show a "current" price that contradicts the orderbook
// (which reflects live quotes).
const toPoints = (
  direction: Direction,
  rows: { t: number; rate: number }[] | undefined,
  liveRate: number | null,
) => {
  const pts = (rows ?? []).map((r) => ({
    t: r.t * 1000,
    value: directionalRateFor(direction, r.rate),
  }));
  const tip = liveRate ?? (pts.length ? pts[pts.length - 1].value : null);
  if (tip != null) pts.push({ t: Date.now(), value: tip });
  return pts;
};

// One side of the route picker: a dropdown of assets. Each side offers only
// chains that form a valid pair with the other side (at least one hub leg),
// so picking never produces an illegal route.
const AssetSelect: React.FC<{
  chain: string;
  chains: string[];
  onSelect: (chain: string) => void;
}> = ({ chain, chains, onSelect }) => {
  const theme = useTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Box
        component="button"
        onClick={(e: React.MouseEvent<HTMLElement>) =>
          setAnchor(e.currentTarget)
        }
        sx={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          fontFamily: FONTS.mono,
          fontSize: '0.8rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.primary',
          px: 1,
          py: 0.5,
          border: `1px solid ${theme.palette.divider}`,
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        <TickerSymbol chain={chain} logoSize={16} />
        <KeyboardArrowDownIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
      </Box>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              border: `1px solid ${theme.palette.divider}`,
              minWidth: 140,
              mt: 0.5,
            },
          },
        }}
      >
        {chains.map((c) => (
          <MenuItem
            key={c}
            selected={c === chain}
            onClick={() => {
              onSelect(c);
              setAnchor(null);
            }}
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              fontWeight: 600,
              py: 1,
              minWidth: 120,
            }}
          >
            <TickerSymbol chain={c} logoSize={15} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

// Market-page hero for ONE direction — the instrument people actually trade
// on Allways (each route has its own crown, miners, and book side). One
// familiar single-line chart in the direction's natural quote unit ("1 SOL →
// 0.00097 BTC"); the opposite route is simply another instrument in the
// pairs rail. The direction is owned by the parent (on the URL).
const AllwaysMarketRate: React.FC<{
  direction: Direction;
  onDirectionChange: (direction: Direction) => void;
  /**
   * The page shows a PairsRail carrying the quote and key stats — the rail
   * is the primary readout, so the hero's own price headline and stat strip
   * render only where the rail doesn't exist (stacked/mobile).
   */
  quoteInRail?: boolean;
  /** Selected window — owned by the page so the rail follows the same
   * toggle (1W on the chart means 1W vol/chg/stats everywhere). */
  range: HeroRange;
  onRangeChange: (range: HeroRange) => void;
}> = ({ direction, onDirectionChange, quoteInRail, range, onRangeChange }) => {
  const theme = useTheme();

  const { from, to } = decomposeDirection(direction);
  const { data: chains } = useChains();
  // Dependent dropdowns: a side only offers what's legal given the OTHER
  // side — any chain that forms a pair with at least one hub leg.
  // Orientation flips via the ⇄ between them, converter-style.
  const optionsFor = (side: 'from' | 'to') => {
    const other = side === 'from' ? to : from;
    return chains
      .map((c) => c.id)
      .filter((c) => c !== other && hubLeg(c, other) != null);
  };
  const pickSide = (side: 'from' | 'to', c: string) => {
    // Options are pre-limited to legal partners, so the pick maps straight
    // onto a route.
    const next = (
      side === 'from' ? `${c}-${to}` : `${from}-${c}`
    ).toUpperCase() as Direction;
    if (next !== direction) onDirectionChange(next);
  };
  const reversed = `${to.toUpperCase()}-${from.toUpperCase()}` as Direction;

  const secs = RANGE_SECS[range];
  const { data: rows, isLoading } = useCrownRateHistory({ direction, secs });

  // Live crown anchors the headline and the chart's right edge — the same
  // quote source the orderbook reflects, so they always agree.
  const { data: crown } = useCurrentCrown();
  // Hub-leg lane (F4): the only lane for a spoke, the SOL lane for sol↔tao.
  const liveRate = directionalRateFor(
    direction,
    crownLaneFor(crown, direction)?.rate,
  );

  const points = useMemo(
    () => toPoints(direction, rows, liveRate),
    [direction, rows, liveRate],
  );
  const last = points.length ? points[points.length - 1].value : null;

  // Open / high / low / close of the crown rate across the window, the
  // quote-bar summary a terminal opens with. These are the extremes of the
  // crown SERIES, not candles: Allways has no fixed bar interval, the crown
  // simply moves when a better quote lands, so O and C are the window's
  // first and last accepted rates and H/L its bounds.
  const ohlc = useMemo(() => {
    // Gaps carry a null value; they are absence of a quote, not a price of
    // zero, so they take no part in the extremes.
    const vals = points
      .map((pt) => pt.value)
      .filter((v): v is number => v != null && Number.isFinite(v));
    if (!vals.length) return null;
    const open = vals[0];
    const close = vals[vals.length - 1];
    return {
      open,
      high: Math.max(...vals),
      low: Math.min(...vals),
      close,
      change: close - open,
      pct: open !== 0 ? ((close - open) / open) * 100 : null,
    };
  }, [points]);

  const [searchOpen, setSearchOpen] = useState(false);

  // One instrument, one line — the house monochrome (a hex value, which the
  // chart's gradient alpha-suffix requires).
  const cLine = theme.palette.text.primary;
  const series = useMemo<ChartSeries[]>(
    () => [
      {
        name: `1 ${from.toUpperCase()} → ${to.toUpperCase()}`,
        color: cLine,
        formatValue: formatRate,
        unit: to.toUpperCase(),
        step: true,
        points,
      },
    ],
    [from, to, cLine, points],
  );

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {/* One compact header row. Stacked: picker and quote left, range chips
          right. With the rail on screen the picker and quote both live there,
          leaving this as the chart's range toolbar. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          columnGap: 2,
          rowGap: 1,
        }}
      >
        {/* Quote bar, the line a terminal opens with: what this is, over
            what window, backed by what, then the window's open/high/low/close
            and the move. The pair name is the search trigger, as it is in
            every terminal. Shown only where the rail exists, because stacked
            layouts carry the dropdown picker and their own headline quote
            instead.

            It shares the toolbar row with the range chips rather than taking
            a band of its own: this sits above a chart that wants every pixel
            of height, and a strip holding one line of text plus a strip
            holding four chips is two rows doing one row's work. */}
        <Box
          sx={{
            display: quoteInRail ? { xs: 'none', md: 'flex' } : 'none',
            alignItems: 'center',
            flexWrap: 'wrap',
            columnGap: 1,
            rowGap: 0.5,
            minWidth: 0,
          }}
        >
          <Box
            component="button"
            onClick={() => setSearchOpen(true)}
            sx={{
              all: 'unset',
              boxSizing: 'border-box',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              px: 0.75,
              py: 0.25,
              ml: -0.75,
              borderRadius: 1,
              '&:hover': { backgroundColor: 'action.hover' },
            }}
          >
            <ChainLogo chain={from} size={15} />
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
              {chainName(from)}
            </Typography>
            <Box component="span" sx={{ color: 'text.disabled' }}>
              →
            </Box>
            <ChainLogo chain={to} size={15} />
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
              {chainName(to)}
            </Typography>
            <KeyboardArrowDownIcon
              sx={{ fontSize: 16, color: 'text.disabled' }}
            />
          </Box>

          {/* Window and backing. Where a broker names the venue, this names
              the collateral the route's miners post and the asset a failed
              delivery repays in; sol↔tao is the one route carrying two. No
              leading separator: it opens a group rather than continuing the
              pair name. */}
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {range} · {lanesFor(direction).map(chainSymbol).join(' + ')} backed
          </Typography>

          {ohlc && (
            <Stack
              direction="row"
              alignItems="baseline"
              spacing={1}
              sx={{ flexWrap: 'wrap', rowGap: 0.25 }}
            >
              {(
                [
                  ['O', ohlc.open],
                  ['H', ohlc.high],
                  ['L', ohlc.low],
                  ['C', ohlc.close],
                ] as const
              ).map(([letter, value]) => (
                <Stack
                  key={letter}
                  direction="row"
                  alignItems="baseline"
                  spacing={0.4}
                >
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.7rem',
                      color: 'text.disabled',
                    }}
                  >
                    {letter}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatRate(value)}
                  </Typography>
                </Stack>
              ))}
              {/* No move colour anywhere on this row. It is a readout, not a
                  signal: O/H/L/C, the change and its percentage are one set
                  of facts about one window, and tinting any of them ranks it
                  above the rest. The chart underneath already carries the
                  direction, and the rail's rows carry it per route. */}
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {ohlc.change > 0 ? '+' : ''}
                {formatRate(ohlc.change)}
                {ohlc.pct != null &&
                  ` (${ohlc.pct > 0 ? '+' : ''}${ohlc.pct.toFixed(2)}%)`}
              </Typography>
            </Stack>
          )}
        </Box>

        {/* Route picker, stacked layouts only. With the rail on screen it is
            a third way to do what the map and the watchlist already do, and
            the weakest of the three: it cannot show which routes carry any
            volume, and reversing takes a button press where the map flips on
            a second click. Below md the rail is not rendered, so this is the
            only way to change instrument and has to stay. */}
        <Box
          sx={{
            display: quoteInRail
              ? { xs: 'inline-flex', md: 'none' }
              : 'inline-flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <AssetSelect
            chain={from}
            chains={optionsFor('from')}
            onSelect={(c) => pickSide('from', c)}
          />
          <Tooltip title="Reverse route" arrow>
            <IconButton
              size="small"
              onClick={() => onDirectionChange(reversed)}
              sx={{ p: 0.5, color: 'text.secondary' }}
            >
              <SwapHorizIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <AssetSelect
            chain={to}
            chains={optionsFor('to')}
            onSelect={(c) => pickSide('to', c)}
          />
        </Box>
        {/* Stacked-only quote: with no rail on screen, the price belongs
            next to the picker. */}
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '1.1rem',
            fontWeight: 700,
            lineHeight: 1.1,
            display: quoteInRail ? { xs: 'flex', md: 'none' } : 'flex',
            alignItems: 'baseline',
            columnGap: 0.75,
          }}
        >
          <Box
            component="span"
            sx={{
              fontSize: '0.8rem',
              color: 'text.secondary',
              fontWeight: 500,
              alignSelf: 'center',
            }}
          >
            1 {from.toUpperCase()} =
          </Box>
          {last != null ? formatRate(last) : '—'}
          <Box
            component="span"
            sx={{
              fontSize: '0.8rem',
              color: 'text.secondary',
              fontWeight: 500,
              alignSelf: 'center',
            }}
          >
            {to.toUpperCase()}
          </Box>
        </Typography>
        <Box sx={{ ml: 'auto', flexShrink: 0 }}>
          <RangeChips value={range} options={RANGES} onChange={onRangeChange} />
        </Box>
      </Box>

      {/* Hero chart: the direction's crown rate over the window. */}
      <Box sx={{ flex: 1, minHeight: 120 }}>
        <TimeSeriesChart
          series={series}
          loading={isLoading}
          height="100%"
          formatValue={formatRate}
          autoScale
          noArea
          market
          emptyLabel="no rate history in this window"
        />
      </Box>

      {/* Route stats over the selected window. With a rail on the page these
          live in its Key stats card — keep the strip only where the layout
          stacks and the rail is gone. */}
      <Box
        sx={{
          display: quoteInRail ? { xs: 'flex', md: 'none' } : 'flex',
          justifyContent: 'flex-start',
          mt: 0.75,
        }}
      >
        <StatsStrip
          bare
          directions={[direction]}
          secs={secs}
          rangeLabel={range}
        />
      </Box>

      <SymbolSearch
        open={searchOpen}
        direction={direction}
        onClose={() => setSearchOpen(false)}
        onSelect={onDirectionChange}
      />
    </Box>
  );
};

export default AllwaysMarketRate;
