import React from 'react';
import { Box, Skeleton, Tooltip, Typography } from '@mui/material';
import {
  useActiveNodeCount,
  useNetworkOverview,
  useStats,
  useUsdPrices,
} from '../../api';
import {
  backingEntries,
  backingTooltip,
  chainSymbol,
  formatUsd,
  usdFromBackingMap,
} from '../../utils/format';
import { FONTS } from '../../theme';

const num = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: 0 });

const amount = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: v >= 1000 ? 0 : 2 });

// One readout in the ribbon: uppercase mono label, tabular value beside it.
// Everything sits on one line — this is a status bar, not a card.
const Readout: React.FC<{
  label: string;
  value: React.ReactNode;
  hint: string;
  loading?: boolean;
}> = ({ label, value, hint, loading }) => (
  <Tooltip title={hint} arrow placement="bottom">
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 0.75,
        px: { xs: 1.25, md: 2 },
        borderRight: '1px solid',
        borderColor: 'divider',
        whiteSpace: 'nowrap',
        '&:last-of-type': { borderRight: 0 },
      }}
    >
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.58rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        {label}
      </Typography>
      {loading ? (
        <Skeleton
          variant="text"
          width={48}
          sx={{ bgcolor: 'action.hover', display: 'inline-block' }}
        />
      ) : (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: { xs: '0.76rem', md: '0.82rem' },
            fontWeight: 700,
            color: 'text.primary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </Typography>
      )}
    </Box>
  </Tooltip>
);

/**
 * The network page's pinned status bar. Five all-time network levels stay on
 * screen no matter how far down the page scrolls, so the tape, the
 * leaderboard and the charts are always read against the same headline
 * numbers. It is the snapshot row the standalone stats page used to open
 * with, flattened into one terminal ribbon.
 */
const NetworkKpiStrip: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: overview, isLoading: overviewLoading } =
    useNetworkOverview('all');
  const { count: activeNodes, isLoading: nodesLoading } = useActiveNodeCount();
  const prices = useUsdPrices();

  // Estimated USD is the one legitimate cross-backing sum; without prices,
  // show each backing's own figure side by side instead of adding them.
  const volumeUsd = usdFromBackingMap(
    stats?.totalVolumeByBacking,
    prices,
    stats?.totalVolumeSol ?? 0,
  );
  const volume =
    volumeUsd != null
      ? formatUsd(volumeUsd)
      : backingEntries(stats?.totalVolumeByBacking, stats?.totalVolumeSol ?? 0)
          .map((e) => `${amount(Number(e.amount))} ${chainSymbol(e.chain)}`)
          .join(' + ');

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        height: 40,
        minHeight: 40,
        width: '100%',
        // The page's own gutters, so the first readout lines up with the
        // section headings below it.
        px: { xs: 0.25, sm: 0.75, md: 1.75 },
        backgroundColor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
        // Narrow viewports swipe the ribbon rather than wrapping it into a
        // second row that would eat the tape's height.
        overflowX: 'auto',
        overflowY: 'hidden',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      <Box
        title={
          volumeUsd != null
            ? backingTooltip(
                stats?.totalVolumeByBacking,
                stats?.totalVolumeSol ?? 0,
              )
            : undefined
        }
        sx={{ display: 'flex', alignItems: 'center' }}
      >
        <Readout
          label="Volume"
          value={volume}
          hint="All-time completed swap volume, estimated in USD at current prices."
          loading={statsLoading}
        />
      </Box>
      <Readout
        label="Txns"
        value={num(stats?.totalSwaps ?? 0)}
        hint="All-time successfully completed transactions."
        loading={statsLoading}
      />
      <Readout
        label="Success"
        value={
          overview ? `${(overview.networkSuccessRate * 100).toFixed(1)}%` : '—'
        }
        hint="Share of all-time resolved transactions that completed rather than timed out."
        loading={overviewLoading}
      />
      <Readout
        label="In flight"
        value={num(stats?.activeSwaps ?? 0)}
        hint="Transactions in progress right now."
        loading={statsLoading}
      />
      <Readout
        label="Nodes"
        value={num(activeNodes)}
        hint="Distinct active nodes currently serving the network."
        loading={nodesLoading}
      />
    </Box>
  );
};

export default NetworkKpiStrip;
