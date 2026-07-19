import React, { useMemo } from 'react';
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

// One side of the book: hittable collateral for a single direction grouped by
// quoted rate, best rate first, with a cumulative running total. Stored rates
// are canonical "spoke per 1 SOL" and are converted to the DIRECTIONAL "to per
// 1 from" here, so higher is always the better rate.
const useDepth = (miners: Miner[] | undefined, direction: Direction) => {
  const { spoke, leg } = decomposeDirection(direction);
  return useMemo(() => {
    const groups: Record<string, number> = {}; // key = rate level, val = SOL
    (miners ?? []).forEach((m) => {
      // Only collateral hittable right now counts as depth: inactive miners
      // can't be traded with, exchanging/reserved miners have theirs locked.
      if (minerSpoke(m) !== spoke) return;
      if (!m.isActive || m.hasActiveSwap || m.isReserved) return;
      if (!m.collateral) return;
      const capacitySol = parseInt(m.collateral, 10) / 1e9;
      if (!Number.isFinite(capacitySol) || capacitySol <= 0) return;
      const raw = leg === 'reverse' ? m.counterRate : m.rate;
      const r = directionalRateFor(direction, raw) ?? 0;
      if (!Number.isFinite(r) || r <= 0) return;
      // formatRate is the price LEVEL key — it groups miners, sorts the book,
      // and is rendered verbatim (2dp would collapse BTC-scale quotes to 0.00).
      const key = formatRate(r);
      groups[key] = (groups[key] || 0) + capacitySol;
    });

    // Levels are directional "to per 1 from" — more output per unit in is
    // always better, so best-first is highest-first for every direction.
    const rates = Object.keys(groups).sort(
      (a, b) => parseFloat(b) - parseFloat(a),
    );

    let cum = 0;
    return rates.map((key) => {
      const capacity = groups[key];
      cum += capacity;
      return { rate: key, capacity, cumCapacity: cum };
    });
  }, [miners, spoke, leg, direction]);
};

// One direction's ladder — half of the two-sided book.
const DepthLadder: React.FC<{
  miners: Miner[] | undefined;
  direction: Direction;
}> = ({ miners, direction }) => {
  const theme = useTheme();
  const { from, to } = decomposeDirection(direction);
  const depthData = useDepth(miners, direction);

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
// ladders side by side, so the whole book is visible at once. The chart's
// direction toggle picks which side is emphasized.
const OrderbookDepth: React.FC<{
  direction: Direction;
}> = ({ direction }) => {
  const { data: miners, isLoading } = useMiners();
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
                Liquidity you can hit right now, both directions of the selected
                pair at once: idle miners' collateral grouped by quoted rate,
                best rate first. The bar behind each row is the cumulative
                capacity walking down the book.
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
        {/* Always show the scope — the chart's toggle drives this panel, and
            without the label that coupling is invisible (QA U3). */}
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.65rem',
            color: 'text.disabled',
          }}
        >
          SOL ⇄ {SPOKE}
        </Typography>
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
        <DepthLadder miners={miners} direction={forward} />
        <DepthLadder miners={miners} direction={reverse} />
      </Box>
    </Box>
  );
};

export default OrderbookDepth;
