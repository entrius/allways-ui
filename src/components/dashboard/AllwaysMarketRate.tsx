import React, { useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';
import { useCrownRateHistory, useMiners } from '../../api';
import {
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import { formatRate } from '../../utils/format';
import { TickerSymbol } from '../ChainLogo';
import { TimeSeriesChart, type ChartSeries } from '../stats';
import StatsStrip from './StatsStrip';

// The non-SOL side of a pair. A string, not a union: pairs are open-ended —
// every spoke chain with registered miners gets a market page automatically.
export type Spoke = string;

// Robinhood-style range chips: window plus the delta caption it produces.
type HeroRange = '1H' | '1D' | '1W' | '1M' | 'ALL';
const RANGES: HeroRange[] = ['1H', '1D', '1W', '1M', 'ALL'];
const RANGE_SECS: Record<HeroRange, number> = {
  '1H': 3_600,
  '1D': 86_400,
  '1W': 604_800,
  '1M': 2_592_000,
  ALL: 31_536_000,
};
const RANGE_CAPTION: Record<HeroRange, string> = {
  '1H': 'past hour',
  '1D': 'past day',
  '1W': 'past week',
  '1M': 'past month',
  ALL: 'all time',
};

// Semantic move colors, used in exactly ONE place — the delta line under the
// headline; the chart and range chips stay monochrome like the rest of the
// site. Light mode mirrors index.css --color-success/--color-danger; dark
// mode brightens both so they read against near-black.
const MOVE_COLORS = {
  light: { up: '#15803d', down: '#b91c1c' },
  dark: { up: '#4ade80', down: '#f87171' },
} as const;

// Directional {t(ms), value} points for one leg's crown history.
const toPoints = (
  direction: Direction,
  rows: { t: number; rate: number }[] | undefined,
) =>
  (rows ?? []).map((r) => ({
    t: r.t * 1000,
    value: directionalRateFor(direction, r.rate),
  }));

// One side of the from → to control. Clicking a side lists every chain the
// network serves; picking one re-resolves the other side to a legal market
// (SOL is the hub), so any asset is reachable from either side and the
// control reads as "anything to anything".
const SideSelect: React.FC<{
  chain: string;
  chains: string[];
  onSelect: (chain: string) => void;
}> = ({ chain, chains, onSelect }) => {
  const theme = useTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState('');

  const close = () => {
    setAnchor(null);
    setQuery('');
  };

  const q = query.trim().toLowerCase();
  const visible = q ? chains.filter((c) => c.includes(q)) : chains;

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
        <TickerSymbol chain={chain} logoSize={17} />
        <KeyboardArrowDownIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
      </Box>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              border: `1px solid ${theme.palette.divider}`,
              minWidth: 180,
              mt: 0.5,
            },
          },
        }}
      >
        {chains.length > 6 && (
          <Box sx={{ px: 1.25, pt: 0.75, pb: 0.75 }}>
            <TextField
              size="small"
              autoFocus
              fullWidth
              placeholder="Search assets..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{ fontSize: 15, color: 'text.secondary' }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: FONTS.mono,
                  fontSize: '0.72rem',
                  borderRadius: 0,
                  height: 30,
                  '& fieldset': { borderColor: 'divider' },
                },
              }}
            />
          </Box>
        )}
        {visible.map((c) => (
          <MenuItem
            key={c}
            selected={c === chain}
            onClick={() => {
              onSelect(c);
              close();
            }}
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              fontWeight: 600,
              py: 1,
              minWidth: 160,
            }}
          >
            <TickerSymbol chain={c} logoSize={15} />
          </MenuItem>
        ))}
        {visible.length === 0 && (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              fontFamily: FONTS.mono,
              fontSize: '0.72rem',
              color: 'text.disabled',
            }}
          >
            no matching assets
          </Box>
        )}
      </Menu>
    </>
  );
};

// Market-page hero for the selected pair: big live rate with a green/red move
// over the chosen window, the reverse quote alongside, and the best-available
// (crown) rate charted over time — the coinbase/robinhood shape, backed by the
// crown ledger. The from/to side selectors compose the market: each side
// picks an asset, the other side re-resolves to keep the market legal, and
// the middle ⇄ swaps them. The spoke is owned by the parent (on the URL).
const AllwaysMarketRate: React.FC<{
  spoke: Spoke;
  onSpokeChange: (spoke: Spoke) => void;
}> = ({ spoke, onSpokeChange }) => {
  const theme = useTheme();
  const [reversed, setReversed] = useState(false);
  const [range, setRange] = useState<HeroRange>('1D');

  const SPOKE = spoke.toUpperCase();
  const forward = `SOL-${SPOKE}` as Direction;
  const reverse = `${SPOKE}-SOL` as Direction;
  const direction = reversed ? reverse : forward;
  const [from, to] = direction.split('-');

  // Every spoke chain with registered miners is a listable pair — the picker
  // grows on its own as new chains come online.
  const { data: miners } = useMiners();
  const spokes = useMemo<Spoke[]>(() => {
    const found = new Set<string>();
    (miners ?? []).forEach((m) => {
      [m.sourceChain, m.destChain]
        .map((c) => c?.toLowerCase())
        .filter((c): c is string => !!c && c !== 'sol')
        .forEach((c) => found.add(c));
    });
    found.add(spoke); // never lose the URL-selected pair
    return found.size > 1 || miners?.length
      ? [...found].sort()
      : ['btc', 'tao'];
  }, [miners, spoke]);

  // A side's menu only offers assets the OTHER side can actually trade
  // with: SOL (the hub) reaches every spoke; a spoke reaches only SOL. So
  // with BTC fixed on one side, the opposite menu is exactly [SOL].
  const optionsFor = (side: 'from' | 'to') => {
    const other = (side === 'from' ? to : from).toLowerCase();
    return other === 'sol' ? spokes : ['sol'];
  };

  // Options are pre-filtered to legal markets, so a pick maps directly onto
  // (spoke, orientation) with no correction needed.
  const pickSide = (side: 'from' | 'to', c: string) => {
    const newFrom = side === 'from' ? c : from.toLowerCase();
    const newTo = side === 'to' ? c : to.toLowerCase();
    const newSpoke = newFrom === 'sol' ? newTo : newFrom;
    if (newSpoke !== spoke) onSpokeChange(newSpoke);
    setReversed(newFrom !== 'sol');
  };

  const secs = RANGE_SECS[range];
  // Both legs load so the flip and the reverse-quote subline are instant.
  const { data: fwdRows, isLoading: fwdLoading } = useCrownRateHistory({
    direction: forward,
    secs,
  });
  const { data: revRows, isLoading: revLoading } = useCrownRateHistory({
    direction: reverse,
    secs,
  });

  const points = useMemo(
    () => toPoints(direction, reversed ? revRows : fwdRows),
    [direction, reversed, fwdRows, revRows],
  );
  const last = points.length ? points[points.length - 1].value : null;
  const first = points.length ? points[0].value : null;
  const deltaPct =
    last != null && first != null && first !== 0
      ? ((last - first) / first) * 100
      : null;
  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const moveColor =
    deltaPct == null || deltaPct === 0
      ? theme.palette.text.secondary
      : deltaPct > 0
        ? move.up
        : move.down;

  // Monochrome line, matching the house chart style (text.primary is a hex
  // value, which the chart's gradient alpha-suffix requires).
  const cLine = theme.palette.text.primary;
  const series = useMemo<ChartSeries[]>(
    () => [
      {
        name: `1 ${from} → ${to}`,
        color: cLine,
        formatValue: formatRate,
        unit: to,
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
      {/* One compact header row: instrument selectors left, the live price
          and its move centered, range chips right — no row of its own for
          the price. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'auto 1fr auto' },
          alignItems: 'center',
          columnGap: 2,
          rowGap: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            justifyContent: { xs: 'center', md: 'flex-start' },
          }}
        >
          <SideSelect
            chain={from.toLowerCase()}
            chains={optionsFor('from')}
            onSelect={(c) => pickSide('from', c)}
          />
          <Tooltip title="Swap sides" arrow>
            <IconButton
              size="small"
              onClick={() => setReversed((r) => !r)}
              sx={{ p: 0.5, color: 'text.secondary' }}
            >
              <SwapHorizIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <SideSelect
            chain={to.toLowerCase()}
            chains={optionsFor('to')}
            onSelect={(c) => pickSide('to', c)}
          />
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            columnGap: 1.5,
            rowGap: 0.25,
          }}
        >
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: { xs: '1.1rem', md: '1.35rem' },
              fontWeight: 700,
              lineHeight: 1.1,
              color: 'text.primary',
              display: 'flex',
              alignItems: 'baseline',
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: '0.8rem',
                color: 'text.secondary',
                fontWeight: 500,
                mr: 0.75,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                alignSelf: 'center',
              }}
            >
              1 <TickerSymbol chain={from} logoSize={15} /> =
            </Box>
            {last != null ? formatRate(last) : '—'}
            <Box
              component="span"
              sx={{
                fontSize: '0.85rem',
                color: 'text.secondary',
                fontWeight: 500,
                ml: 0.75,
                alignSelf: 'center',
              }}
            >
              <TickerSymbol chain={to} logoSize={15} />
            </Box>
          </Typography>
          {deltaPct != null && (
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.72rem',
                color: moveColor,
                fontWeight: 600,
              }}
            >
              {deltaPct > 0 ? '▲' : deltaPct < 0 ? '▼' : ''}{' '}
              {Math.abs(deltaPct).toFixed(2)}% {RANGE_CAPTION[range]}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            justifyContent: { xs: 'center', md: 'flex-end' },
          }}
        >
          {RANGES.map((r) => (
            <Box
              key={r}
              component="button"
              onClick={() => setRange(r)}
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

      {/* Symbol stats: the selected direction over the selected window. */}
      <Box
        sx={{ display: 'flex', justifyContent: 'center', mt: 0.75, mb: 0.75 }}
      >
        <StatsStrip bare direction={direction} secs={secs} rangeLabel={range} />
      </Box>

      {/* Hero chart: best-available (crown) rate over the window. */}
      <Box sx={{ flex: 1, minHeight: 120 }}>
        <TimeSeriesChart
          series={series}
          loading={reversed ? revLoading : fwdLoading}
          height="100%"
          formatValue={formatRate}
          autoScale
          emptyLabel="no rate history in this window"
        />
      </Box>
    </Box>
  );
};

export default AllwaysMarketRate;
