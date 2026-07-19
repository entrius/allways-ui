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
import { useMiners, type Miner } from '../../api';
import {
  decomposeDirection,
  directionLabel,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import { formatRate } from '../../utils/format';
import { OrderbookDepthSkeleton } from './Skeletons';

// The non-hub side of a miner's pair (canonical order pins SOL as source, so
// this is normally destChain), lowercased — or null if the miner has no pair.
const minerSpoke = (m: Miner): string | null => {
  const chains = [m.sourceChain, m.destChain]
    .map((c) => c?.toLowerCase())
    .filter((c): c is string => !!c && c !== 'sol');
  return chains[0] ?? null;
};

// Price grouping, shared by both books and expressed as a share of the price
// so one control reads the same on a 0.00096 book and a 715 book: levels
// merge into buckets roughly this fraction of the price wide. null = auto,
// which picks the finest option that fits the panel without a scrollbar.
type DepthGroup = number | null;
const GROUP_OPTIONS: { label: string; mult: number | null }[] = [
  { label: 'Auto', mult: null },
  { label: '0.001%', mult: 1 },
  { label: '0.01%', mult: 10 },
  { label: '0.1%', mult: 100 },
  { label: '1%', mult: 1000 },
];
const AUTO_FIT_ROWS = 6;

// One side of the book: TAKEABLE liquidity for a single direction grouped by
// quoted rate, best rate first, with a cumulative running total. Only
// collateral hittable this instant counts — active miners that are not
// reserved or mid-swap — so the top of the book always agrees with the
// chart's crown price. Stored rates are canonical "spoke per 1 SOL" and are
// converted to the DIRECTIONAL "to per 1 from" here, so higher is always the
// better rate.
const useDepth = (
  miners: Miner[] | undefined,
  direction: Direction,
  group: DepthGroup,
) => {
  const { spoke, leg } = decomposeDirection(direction);
  return useMemo(() => {
    const entries: { r: number; cap: number }[] = [];
    (miners ?? []).forEach((m) => {
      if (minerSpoke(m) !== spoke) return;
      if (!m.isActive || m.hasActiveSwap || m.isReserved) return;
      if (!m.collateral) return;
      const capacitySol = parseInt(m.collateral, 10) / 1e9;
      if (!Number.isFinite(capacitySol) || capacitySol <= 0) return;
      const raw = leg === 'reverse' ? m.counterRate : m.rate;
      const r = directionalRateFor(direction, raw) ?? 0;
      if (!Number.isFinite(r) || r <= 0) return;
      entries.push({ r, cap: capacitySol });
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

    // Levels are directional "to per 1 from" — more output per unit in is
    // always better, so best-first is highest-first for every direction.
    const rates = [...buckets.keys()].sort((a, b) => b - a);
    let cum = 0;
    return rates.map((r) => {
      const capacity = buckets.get(r) ?? 0;
      cum += capacity;
      return { rate: formatRate(r), capacity, cumCapacity: cum };
    });
  }, [miners, spoke, leg, direction, group]);
};

// One direction's ladder — half of the two-sided book.
const DepthLadder: React.FC<{
  miners: Miner[] | undefined;
  direction: Direction;
  group: DepthGroup;
}> = ({ miners, direction, group }) => {
  const theme = useTheme();
  const { from, to } = decomposeDirection(direction);
  const depthData = useDepth(miners, direction, group);

  const maxCum = useMemo(
    () =>
      depthData.reduce((m, r) => (r.cumCapacity > m ? r.cumCapacity : m), 1),
    [depthData],
  );

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
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <TableContainer
        sx={{
          flex: 1,
          minHeight: 0,
          // Vertical scroll only — the fixed table layout below guarantees the
          // columns always fit the column width.
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
              {/* One sentence instead of caption + unit: rows below complete
                  it ("1 BTC → 741.89 SOL"). */}
              <TableCell sx={{ ...headerSx, width: '40%' }}>
                1 {from.toUpperCase()} → {to.toUpperCase()}
              </TableCell>
              <TableCell sx={{ ...headerSx, width: '32%' }} align="right">
                Capacity (SOL)
              </TableCell>
              <TableCell sx={{ ...headerSx, width: '28%' }} align="right">
                Cumulative
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {depthData.map((row) => {
              const pct = (row.cumCapacity / maxCum) * 100;
              return (
                <TableRow
                  key={row.rate}
                  sx={{
                    backgroundColor: 'transparent',
                    backgroundImage: `linear-gradient(to left, ${barColor} ${pct}%, transparent ${pct}%)`,
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  <TableCell sx={{ ...cellSx, color: 'text.primary' }}>
                    {row.rate}
                  </TableCell>
                  <TableCell
                    sx={{ ...cellSx, color: 'text.secondary' }}
                    align="right"
                  >
                    {row.capacity.toFixed(2)}
                  </TableCell>
                  <TableCell
                    sx={{ ...cellSx, color: 'text.primary', fontWeight: 600 }}
                    align="right"
                  >
                    {row.cumCapacity.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}

            {depthData.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  sx={{
                    textAlign: 'center',
                    borderBottom: 'none',
                    py: 3,
                    fontFamily: FONTS.mono,
                    fontSize: '0.72rem',
                    color: 'text.secondary',
                  }}
                >
                  No open liquidity for {directionLabel(direction)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Two-sided depth of market for the page's active PAIR: both directions'
// ladders side by side, so the whole book is visible at once.
const OrderbookDepth: React.FC<{
  direction: Direction;
}> = ({ direction }) => {
  const theme = useTheme();
  const { data: miners, isLoading } = useMiners();
  // Price grouping shared by both ladders (percent-of-price, so one control
  // fits both scales); auto coarsens each side until it fits the panel.
  const [group, setGroup] = useState<DepthGroup>(null);
  const { spoke } = decomposeDirection(direction);
  const SPOKE = spoke.toUpperCase();
  const forward = `SOL-${SPOKE}` as Direction;
  const reverse = `${SPOKE}-SOL` as Direction;

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
                Resting liquidity, both directions of the selected pair at once:
                active miners' collateral grouped by quoted rate, best rate
                first — including capacity currently reserved or mid-swap. The
                bar behind each row is the cumulative capacity walking down the
                book.
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

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2.5,
        }}
      >
        <DepthLadder miners={miners} direction={forward} group={group} />
        <DepthLadder miners={miners} direction={reverse} group={group} />
      </Box>
    </Box>
  );
};

export default OrderbookDepth;
