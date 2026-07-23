import React, { useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useCrownRateHistory, useCurrentCrown } from '../../api';
import {
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { useSpokes } from '../../hooks';
import { FONTS } from '../../theme';
import { formatRate } from '../../utils/format';
import { TickerSymbol } from '../ChainLogo';
import { TimeSeriesChart, type ChartSeries } from '../stats';
import StatsStrip from './StatsStrip';

// The non-SOL side of a pair. A string, not a union: pairs are open-ended —
// every spoke chain with registered miners gets a market page automatically.
export type Spoke = string;

// Semantic move colors (up green / down red), shared with the pairs rail's
// change column. Light mode mirrors index.css --color-success/--color-danger;
// dark mode brightens both so they read against near-black.
export const MOVE_COLORS = {
  light: { up: '#15803d', down: '#b91c1c' },
  dark: { up: '#4ade80', down: '#f87171' },
} as const;

// Robinhood-style range chips. Longer windows (1M/ALL) return once the
// network has enough history to make them meaningful.
export type HeroRange = '1H' | '1D' | '1W';
const RANGES: HeroRange[] = ['1H', '1D', '1W'];
export const RANGE_SECS: Record<HeroRange, number> = {
  '1H': 3_600,
  '1D': 86_400,
  '1W': 604_800,
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

// One side of the route picker: a dropdown of assets. Picking a side
// re-resolves the other side to keep the route legal (SOL is the hub, so
// exactly one side is always SOL).
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

  const { from, to, spoke } = decomposeDirection(direction);
  const spokes = useSpokes(spoke);
  // Dependent dropdowns: a side only offers what's legal given the OTHER
  // side — SOL there means this side picks among spokes; a spoke there
  // pins this side to SOL (the hub). Orientation flips via the ⇄ between
  // them, converter-style.
  const optionsFor = (side: 'from' | 'to') => {
    const other = side === 'from' ? to : from;
    return other === 'sol' ? spokes : ['sol'];
  };
  const pickSide = (side: 'from' | 'to', c: string) => {
    // Options are pre-limited to legal partners, so the pick maps straight
    // onto a route.
    const C = c.toUpperCase();
    const next: Direction =
      side === 'from'
        ? c === 'sol'
          ? (`SOL-${to.toUpperCase()}` as Direction)
          : (`${C}-SOL` as Direction)
        : c === 'sol'
          ? (`${from.toUpperCase()}-SOL` as Direction)
          : (`SOL-${C}` as Direction);
    if (next !== direction) onDirectionChange(next);
  };
  const reversed = `${to.toUpperCase()}-${from.toUpperCase()}` as Direction;

  const secs = RANGE_SECS[range];
  const { data: rows, isLoading } = useCrownRateHistory({ direction, secs });

  // Live crown anchors the headline and the chart's right edge — the same
  // quote source the orderbook reflects, so they always agree.
  const { data: crown } = useCurrentCrown();
  const liveRate = directionalRateFor(direction, crown?.[direction]?.rate);

  const points = useMemo(
    () => toPoints(direction, rows, liveRate),
    [direction, rows, liveRate],
  );
  const last = points.length ? points[points.length - 1].value : null;

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
      {/* One compact header row: instrument picker left, range chips right.
          The quote itself lives in the rail (or, stacked, right here). */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          columnGap: 2,
          rowGap: 1,
        }}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
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
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            ml: 'auto',
          }}
        >
          {RANGES.map((r) => (
            <Box
              key={r}
              component="button"
              onClick={() => onRangeChange(r)}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                fontFamily: FONTS.mono,
                fontSize: '0.65rem',
                letterSpacing: '0.05em',
                px: 1,
                py: 0.4,
                color:
                  range === r
                    ? theme.palette.background.paper
                    : theme.palette.text.secondary,
                backgroundColor:
                  range === r ? theme.palette.text.primary : 'transparent',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor:
                    range === r
                      ? theme.palette.text.primary
                      : theme.palette.action.hover,
                },
              }}
            >
              {r}
            </Box>
          ))}
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
    </Box>
  );
};

export default AllwaysMarketRate;
