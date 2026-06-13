import React, { useMemo } from 'react';
import {
  Box,
  IconButton,
  Stack,
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
import { useMiners } from '../../api';
import type { Direction } from '../../api/models/MinersDashboard';
import type { Miner } from '../../api/models/Miners';
import { FONTS } from '../../theme';
import { OrderbookDepthSkeleton } from './Skeletons';

type Side = 'forward' | 'reverse';
type DepthRow = { rate: string; capacity: number; cumCapacity: number };

const sideLabel = (side: Side) =>
  side === 'reverse' ? 'TAO → BTC' : 'BTC → TAO';

// Cumulative depth for one trade side: group hittable miner collateral by
// quoted rate, best rate first, accumulating capacity. Pure so it can be
// memoized once per side and reused by both the single and BOTH views.
const buildDepth = (
  miners: Miner[] | undefined,
  asset: string,
  side: Side,
): DepthRow[] => {
  if (!miners?.length) return [];
  const a = asset.toLowerCase();
  const groups: Record<string, number> = {}; // key = rate, val = collateral TAO

  miners.forEach((m) => {
    // Only miners whose collateral is hittable right now count as depth.
    // Inactive miners still have a quote on-chain but no one can take it;
    // exchanging miners have their collateral locked in a swap; reserved
    // miners have it locked by a pending swap. This panel answers "what rate
    // can I actually use right now?".
    if (!m.isActive || m.hasActiveSwap || m.isReserved) return;
    if (!m.collateralRao) return;
    const s = m.sourceChain?.toLowerCase();
    const d = m.destChain?.toLowerCase();
    if (s !== a || d !== 'tao') return;
    const capacityTao = parseInt(m.collateralRao, 10) / 1e9;
    if (isNaN(capacityTao) || capacityTao <= 0) return;
    const raw = side === 'forward' ? m.rate : m.counterRate;
    const r = raw ? parseFloat(raw) : 0;
    if (!isFinite(r) || r <= 0) return;
    const key = r.toFixed(2);
    groups[key] = (groups[key] || 0) + capacityTao;
  });

  // Best rate first: forward wants highest TAO/asset, reverse wants lowest.
  const rates = Object.keys(groups).sort((x, y) =>
    side === 'forward'
      ? parseFloat(y) - parseFloat(x)
      : parseFloat(x) - parseFloat(y),
  );

  let cum = 0;
  return rates.map((key) => {
    const capacity = groups[key];
    cum += capacity;
    return { rate: key, capacity, cumCapacity: cum };
  });
};

const OrderbookDepth: React.FC<{
  embedded?: boolean;
  direction?: Direction;
  showBoth?: boolean;
}> = ({ embedded, direction = 'BTC-TAO', showBoth = false }) => {
  const theme = useTheme();

  const TAO_COLOR = theme.palette.asset.tao;
  const BTC_COLOR = theme.palette.asset.btc;

  const BtcIcon = ({ size = 16 }: { size?: number }) => (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <circle cx="16" cy="16" r="16" fill={BTC_COLOR} />
      <path
        fill="var(--color-white)"
        fillRule="evenodd"
        d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z"
      />
    </svg>
  );

  const TaoIcon = ({ size = 16, color }: { size?: number; color?: string }) => (
    <svg viewBox="0 0 21.6 23.1" width={size} height={size}>
      <path
        fill={color || TAO_COLOR}
        d="M13.1,17.7V8.3c0-2.4-1.9-4.3-4.3-4.3v15.1c0,2.2,1.7,4,3.9,4c0.1,0,0.1,0,0.2,0c1,0.1,2.1-0.2,2.9-0.9C13.3,22,13.1,20.5,13.1,17.7L13.1,17.7z"
      />
      <path
        fill={color || TAO_COLOR}
        d="M3.9,0C1.8,0,0,1.8,0,4h17.6c2.2,0,3.9-1.8,3.9-4C21.6,0,3.9,0,3.9,0z"
      />
    </svg>
  );

  const headerSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  };

  const cellSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.75rem',
    borderBottom: `1px solid ${theme.palette.divider}`,
  };

  const { data: miners, isLoading } = useMiners();

  // Driven by the shared dashboard direction so the orderbook mirrors the
  // market-rate chart's BTC↔TAO toggle. 'BTC-TAO' → forward quote (m.rate);
  // 'TAO-BTC' → reverse quote (m.counterRate). BOTH shows both sides stacked.
  const activeSide: Side = direction === 'TAO-BTC' ? 'reverse' : 'forward';

  const forward = useMemo(() => buildDepth(miners, 'BTC', 'forward'), [miners]);
  const reverse = useMemo(() => buildDepth(miners, 'BTC', 'reverse'), [miners]);

  // One depth ladder (header label + table) for a given side. Flexes to fill
  // its share of the panel and scrolls internally.
  const renderLadder = (side: Side, rows: DepthRow[]) => {
    const maxCum = rows.reduce(
      (m, r) => (r.cumCapacity > m ? r.cumCapacity : m),
      1,
    );
    const fillColor = side === 'forward' ? BTC_COLOR : TAO_COLOR;

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          flex: 1,
        }}
      >
        <TableContainer
          sx={{
            flex: 1,
            minHeight: 0,
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.border.light,
              borderRadius: 0,
            },
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>
                  <Tooltip
                    title={`Quoted rate for ${sideLabel(side)} (TAO per 1 BTC).`}
                    arrow
                    placement="top"
                  >
                    <span
                      style={{ cursor: 'pointer', borderBottom: '1px dotted' }}
                    >
                      Rate (TAO)
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={headerSx} align="right">
                  <Tooltip
                    title="Capacity at this exact rate, denominated in TAO collateral."
                    arrow
                    placement="top"
                  >
                    <span
                      style={{ cursor: 'pointer', borderBottom: '1px dotted' }}
                    >
                      Capacity (TAO)
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={headerSx} align="right">
                  <Tooltip
                    title="Cumulative capacity walking from the best rate down."
                    arrow
                    placement="top"
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        cursor: 'pointer',
                      }}
                    >
                      {side === 'reverse' ? (
                        <>
                          <TaoIcon /> {'→'} <BtcIcon />
                        </>
                      ) : (
                        <>
                          <BtcIcon /> {'→'} <TaoIcon />
                        </>
                      )}
                    </Box>
                  </Tooltip>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const pct = (row.cumCapacity / maxCum) * 100;
                const gradColor = `color-mix(in srgb, ${fillColor} 14%, transparent)`;

                return (
                  <TableRow
                    key={row.rate}
                    sx={{
                      backgroundColor: 'transparent',
                      backgroundImage: `linear-gradient(to left, ${gradColor} ${pct}%, transparent ${pct}%)`,
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <TableCell sx={{ ...cellSx, color: 'text.primary' }}>
                      {row.rate}
                    </TableCell>
                    <TableCell
                      sx={{ ...cellSx, color: 'text.primary' }}
                      align="right"
                    >
                      {row.capacity.toFixed(2)}
                    </TableCell>
                    <TableCell
                      sx={{ ...cellSx, color: fillColor }}
                      align="right"
                    >
                      {row.cumCapacity.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    sx={{
                      textAlign: 'center',
                      borderBottom: 'none',
                      py: 4,
                      fontFamily: FONTS.mono,
                      fontSize: '0.8rem',
                      color: 'text.secondary',
                    }}
                  >
                    No depth data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // BOTH view: overlay the two sides on one shared price (TAO/BTC) axis.
  // Reverse quotes are asks (selling BTC) and sit above forward quotes, the
  // bids (buying BTC); the gap between best ask and best bid is the spread.
  const renderBook = () => {
    const asks = reverse; // best (lowest) first, cumulative outward
    const bids = forward; // best (highest) first, cumulative outward
    const maxCum = Math.max(
      asks.length ? asks[asks.length - 1].cumCapacity : 0,
      bids.length ? bids[bids.length - 1].cumCapacity : 0,
      1,
    );
    const bestAsk = asks.length ? parseFloat(asks[0].rate) : null;
    const bestBid = bids.length ? parseFloat(bids[0].rate) : null;
    const spread =
      bestAsk != null && bestBid != null ? bestAsk - bestBid : null;
    const mid =
      bestAsk != null && bestBid != null ? (bestAsk + bestBid) / 2 : null;
    const spreadPct = spread != null && mid ? (spread / mid) * 100 : null;
    const asksDisplay = [...asks].reverse(); // highest price on top

    const bookRow = (side: Side, r: DepthRow) => {
      const pct = (r.cumCapacity / maxCum) * 100;
      const fillColor = side === 'forward' ? BTC_COLOR : TAO_COLOR;
      const gradColor = `color-mix(in srgb, ${fillColor} 14%, transparent)`;
      return (
        <TableRow
          key={`${side}-${r.rate}`}
          sx={{
            backgroundColor: 'transparent',
            backgroundImage: `linear-gradient(to left, ${gradColor} ${pct}%, transparent ${pct}%)`,
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <TableCell sx={{ ...cellSx, color: fillColor }}>{r.rate}</TableCell>
          <TableCell sx={{ ...cellSx, color: 'text.primary' }} align="right">
            {r.capacity.toFixed(2)}
          </TableCell>
          <TableCell sx={{ ...cellSx, color: fillColor }} align="right">
            {r.cumCapacity.toFixed(2)}
          </TableCell>
        </TableRow>
      );
    };

    return (
      <TableContainer
        sx={{
          flex: 1,
          minHeight: 0,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.border.light,
            borderRadius: 0,
          },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={headerSx}>Rate (TAO)</TableCell>
              <TableCell sx={headerSx} align="right">
                Capacity (TAO)
              </TableCell>
              <TableCell sx={headerSx} align="right">
                Total (TAO)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {asksDisplay.map((r) => bookRow('reverse', r))}

            <TableRow>
              <TableCell
                colSpan={3}
                sx={{
                  ...cellSx,
                  py: 0.75,
                  textAlign: 'center',
                  fontSize: '0.65rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  backgroundColor: 'action.hover',
                  borderTop: `1px solid ${theme.palette.divider}`,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                {spread != null
                  ? `Spread  ${spread.toFixed(2)} TAO${
                      spreadPct != null ? `  (${spreadPct.toFixed(2)}%)` : ''
                    }`
                  : 'Spread  —'}
              </TableCell>
            </TableRow>

            {bids.map((r) => bookRow('forward', r))}

            {asks.length === 0 && bids.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  sx={{
                    textAlign: 'center',
                    borderBottom: 'none',
                    py: 4,
                    fontFamily: FONTS.mono,
                    fontSize: '0.8rem',
                    color: 'text.secondary',
                  }}
                >
                  No depth data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return isLoading || !miners ? (
    <OrderbookDepthSkeleton />
  ) : (
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
          justifyContent: embedded ? 'flex-end' : 'space-between',
          mb: 2,
        }}
      >
        {!embedded && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h6"
              sx={{ fontFamily: FONTS.heading, fontWeight: 700 }}
            >
              Depth of Market
            </Typography>
            <Tooltip
              title={
                <Stack spacing={0.5} sx={{ maxWidth: 250 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    What is this?
                  </Typography>
                  <Typography variant="body2">
                    This orderbook visualizes the cumulative liquidity available
                    across all active miners at various exchange rates.
                  </Typography>
                  <Typography variant="body2">
                    The background bars form a volume profile: the market
                    equilibrium point is where the left and right profiles match
                    in width.
                  </Typography>
                </Stack>
              }
              arrow
              placement="right"
            >
              <IconButton size="small" sx={{ p: 0, color: 'text.secondary' }}>
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {showBoth ? 'BOTH' : sideLabel(activeSide)}
        </Typography>
      </Box>

      {showBoth
        ? renderBook()
        : renderLadder(
            activeSide,
            activeSide === 'forward' ? forward : reverse,
          )}
    </Box>
  );
};

export default OrderbookDepth;
