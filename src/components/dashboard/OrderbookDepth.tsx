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
  directionLabel,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import {
  canonicalSource,
  chainSymbol,
  formatRate,
  unitsToHuman,
} from '../../utils/format';
import { hubChains } from '../../api/models/chains';
import { OrderbookDepthSkeleton } from './Skeletons';

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
// chart's crown price. Stored rates are canonical "spoke per 1 anchor", and
// converted to the DIRECTIONAL "to per 1 from" here, so higher is always the
// better rate.
const useDepth = (
  miners: Miner[] | undefined,
  direction: Direction,
  group: DepthGroup,
) => {
  const { from, to, leg } = decomposeDirection(direction);
  return useMemo(() => {
    // Capacity is tracked PER BACKING (its own asset, human units) — a sol-
    // and a tao-backed quote on the same level never sum into one number.
    const entries: { r: number; backing: string; cap: number }[] = [];
    (miners ?? []).forEach((m) => {
      if (!minerServesPair(m, from, to)) return;
      if (!m.isActive || m.hasActiveSwap || m.isReserved) return;
      if (!m.collateral) return;
      const backing = (m.backing ?? 'sol').toLowerCase();
      const cap = unitsToHuman(m.collateral, backing);
      if (!Number.isFinite(cap) || cap <= 0) return;
      const raw = leg === 'reverse' ? m.counterRate : m.rate;
      const r = directionalRateFor(direction, raw) ?? 0;
      if (!Number.isFinite(r) || r <= 0) return;
      entries.push({ r, backing, cap });
    });
    if (!entries.length) return [];

    // The side's concrete tick for a grouping option: ~0.001% of the best
    // rate at the finest setting, scaling ×10 per step.
    const best = entries.reduce((mx, e) => (e.r > mx ? e.r : mx), 0);
    const base = Math.pow(10, Math.floor(Math.log10(best)) - 4);
    const bucketize = (mult: number) => {
      const tick = base * mult;
      const buckets = new Map<number, Record<string, number>>();
      for (const e of entries) {
        // Floor to the tick (epsilon dodges float drift), so a level's label
        // never overstates the rate a taker would get.
        const b = Math.floor(e.r / tick + 1e-9) * tick;
        const caps = buckets.get(b) ?? {};
        caps[e.backing] = (caps[e.backing] ?? 0) + e.cap;
        buckets.set(b, caps);
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
    const cum: Record<string, number> = {};
    return rates.map((r) => {
      const caps = buckets.get(r) ?? {};
      for (const [b, v] of Object.entries(caps)) cum[b] = (cum[b] ?? 0) + v;
      return { rate: formatRate(r), caps, cumCaps: { ...cum } };
    });
  }, [miners, from, to, leg, direction, group]);
};

// One direction's ladder — half of the two-sided book.
// "1.20 SOL + 4.00 TAO" — a level's per-backing capacities, hub-priority
// order, zero entries dropped. Never a cross-denomination sum.
const fmtCaps = (caps: Record<string, number>): string => {
  const order = hubChains();
  return (
    Object.entries(caps)
      .filter(([, v]) => v > 0)
      .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
      .map(([b, v]) => `${v.toFixed(2)} ${chainSymbol(b)}`)
      .join(' + ') || '0.00'
  );
};

const DepthLadder: React.FC<{
  miners: Miner[] | undefined;
  direction: Direction;
  group: DepthGroup;
}> = ({ miners, direction, group }) => {
  const theme = useTheme();
  const { from, to } = decomposeDirection(direction);
  const depthData = useDepth(miners, direction, group);

  // Depth bars need one scalar; size them on the pair's anchor backing (the
  // dominant purse) — other backings still show in the level's text.
  const anchor = canonicalSource(from, to);
  const maxCum = useMemo(
    () => depthData.reduce((m, r) => Math.max(m, r.cumCaps[anchor] ?? 0), 1),
    [depthData, anchor],
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
              <TableCell sx={{ ...headerSx, width: { xs: '52%', sm: '40%' } }}>
                1 {from.toUpperCase()} → {to.toUpperCase()}
              </TableCell>
              {/* Per-level capacity folds away on phones — rate + cumulative
                  is the readable core; headers were truncating mid-word. */}
              <TableCell
                sx={{
                  ...headerSx,
                  width: '32%',
                  display: { xs: 'none', sm: 'table-cell' },
                }}
                align="right"
              >
                Capacity
              </TableCell>
              <TableCell
                sx={{ ...headerSx, width: { xs: '48%', sm: '28%' } }}
                align="right"
              >
                Cumulative
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {depthData.map((row) => {
              const pct = ((row.cumCaps[anchor] ?? 0) / maxCum) * 100;
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
                    sx={{
                      ...cellSx,
                      color: 'text.secondary',
                      display: { xs: 'none', sm: 'table-cell' },
                    }}
                    align="right"
                  >
                    {fmtCaps(row.caps)}
                  </TableCell>
                  <TableCell
                    sx={{ ...cellSx, color: 'text.primary', fontWeight: 600 }}
                    align="right"
                  >
                    {fmtCaps(row.cumCaps)}
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
  // Both ladders come from the SELECTED pair's own legs — canonical
  // (anchor→spoke) first — never rebuilt around a hardcoded hub.
  const { from, to, leg } = decomposeDirection(direction);
  const forward = (
    leg === 'forward' ? `${from}-${to}` : `${to}-${from}`
  ).toUpperCase() as Direction;
  const reverse = (
    leg === 'forward' ? `${to}-${from}` : `${from}-${to}`
  ).toUpperCase() as Direction;

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
          // One side at a time, stacked: the book reads down, not across.
          gridTemplateColumns: '1fr',
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
