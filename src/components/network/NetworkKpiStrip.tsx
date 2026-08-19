import React, { useMemo } from 'react';
import { Box, Skeleton, Tooltip, Typography } from '@mui/material';
import {
  useHistory,
  useNetworkOverview,
  useStats,
  useUsdPrices,
} from '../../api';
import {
  backingEntries,
  backingTooltip,
  chainSymbol,
  formatDurationSecs,
  formatUsd,
  usdFromBackingMap,
} from '../../utils/format';
import { FONTS } from '../../theme';

/** Height of the ribbon — the page anchors its sections below it. */
export const KPI_STRIP_H = 48;

const num = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: 0 });

const amount = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: v >= 1000 ? 0 : 2 });

// "SOL-TAO" is a direction, not a market: the asset sent, then the asset
// received.
const fmtDirection = (pair: string) => pair.replace(/-/g, '→');

// One readout: small uppercase label, the number beside it at reading
// weight. Five of them, no more — this bar is the one thing a first-time
// visitor is meant to walk away remembering, and a wall of counters is not
// memorable.
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
        gap: 1,
        px: { xs: 1.5, md: 2.75 },
        borderRight: '1px solid',
        borderColor: 'divider',
        whiteSpace: 'nowrap',
        '&:last-of-type': { borderRight: 0 },
      }}
    >
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.56rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        {label}
      </Typography>
      {loading ? (
        <Skeleton
          variant="text"
          width={56}
          sx={{ bgcolor: 'action.hover', display: 'inline-block' }}
        />
      ) : (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: { xs: '0.82rem', md: '0.92rem' },
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
 * The network page's pinned bar: what the network has settled, how
 * reliably, how fast, and where the flow goes. Five figures, all-time,
 * chosen as the claims worth remembering rather than every counter the API
 * can produce — the per-day detail is a scroll away in the stats section.
 */
const NetworkKpiStrip: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: overview, isLoading: overviewLoading } =
    useNetworkOverview('all');
  // Same query the stats charts read, so the two can never disagree and the
  // second reader pays nothing for it.
  const { data: history, isLoading: historyLoading } = useHistory('all', 'day');
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

  // Mean time from initiation to completion across every day the network
  // has run, weighted by each day's transaction count — an unweighted mean
  // of daily means would let a one-swap day count as much as a busy one.
  const settle = useMemo(() => {
    let weighted = 0;
    let swaps = 0;
    for (const r of history ?? []) {
      if (r.avgSettlementSecs == null || r.swaps <= 0) continue;
      weighted += r.avgSettlementSecs * r.swaps;
      swaps += r.swaps;
    }
    return swaps ? weighted / swaps : null;
  }, [history]);

  // Volume split by direction (asset sent -> asset received), biggest
  // first. Each direction is its own instrument, so SOL->TAO and TAO->SOL
  // stay separate rather than being pooled into one "pair".
  const pairMix = useMemo(
    () =>
      (overview?.pairMix ?? [])
        .map((p) => ({ ...p, pct: Number(p.pct) }))
        .sort((a, b) => b.pct - a.pct),
    [overview],
  );
  const top = pairMix[0];
  // USD counterpart for the tooltip's per-direction figures, when priced.
  const overviewVolumeUsd = usdFromBackingMap(
    overview?.volumeByBacking,
    prices,
    overview?.volumeSol ?? 0,
  );
  // The bar names the busiest route; the whole ranking is one hover away.
  const routeHint = pairMix.length
    ? `Busiest route by share of all-time volume. Full mix (asset sent → asset received): ${pairMix
        .map(
          (p) =>
            `${p.pair.replace(/-/g, ' → ')} ${p.pct.toFixed(1)}%` +
            (overviewVolumeUsd != null
              ? ` (${formatUsd((p.pct / 100) * overviewVolumeUsd)})`
              : ''),
        )
        .join(' · ')}`
    : 'No completed volume yet, so no route to rank.';

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        height: KPI_STRIP_H,
        minHeight: KPI_STRIP_H,
        width: '100%',
        px: { xs: 0, sm: 0.5, md: 1 },
        backgroundColor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
        // Narrow viewports swipe the bar rather than wrapping it into a
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
          label="Settled"
          value={volume}
          hint="Total value moved across chains since launch, estimated in USD at current prices."
          loading={statsLoading}
        />
      </Box>
      <Readout
        label="Transactions"
        value={num(stats?.totalSwaps ?? 0)}
        hint="Cross-chain transactions completed since launch."
        loading={statsLoading}
      />
      <Readout
        label="Success"
        value={
          overview ? `${(overview.networkSuccessRate * 100).toFixed(1)}%` : '—'
        }
        hint="Share of resolved transactions that completed rather than timed out, since launch."
        loading={overviewLoading}
      />
      <Readout
        label="Avg settle"
        value={settle == null ? '—' : formatDurationSecs(settle)}
        hint="Average time from initiation to completion, across every transaction the network has settled."
        loading={historyLoading}
      />
      <Readout
        label="Busiest route"
        value={
          top ? (
            <Box component="span" sx={{ display: 'inline-flex', gap: 0.75 }}>
              {fmtDirection(top.pair)}
              <Box
                component="span"
                sx={{ color: 'text.secondary', fontWeight: 500 }}
              >
                {top.pct.toFixed(0)}%
              </Box>
            </Box>
          ) : (
            '—'
          )
        }
        hint={routeHint}
        loading={overviewLoading}
      />
    </Box>
  );
};

export default NetworkKpiStrip;
