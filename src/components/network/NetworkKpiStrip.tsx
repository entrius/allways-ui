import React, { useMemo } from 'react';
import { Box, Skeleton, Tooltip, Typography } from '@mui/material';
import {
  useActiveNodeCount,
  useHistory,
  useNetworkOverview,
  useStats,
  useUsdPrices,
} from '../../api';
import type { HistoryRow } from '../../api/models';
import {
  backingEntries,
  backingTooltip,
  chainSymbol,
  formatDurationSecs,
  formatUsd,
  lamportsToSol,
  usdFromBackingMap,
} from '../../utils/format';
import { FONTS } from '../../theme';

/** Height of the whole ribbon — the page anchors its sections below it. */
export const KPI_STRIP_H = 64;
const ROW_H = KPI_STRIP_H / 2;

const num = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: 0 });

const amount = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: v >= 1000 ? 0 : 2 });

// "SOL-TAO" is a direction, not a market: the asset sent, then the asset
// received. The ribbon writes it tight (no spaces round the arrow) because
// three of them share a line with the rest of the all-time readouts.
const fmtDirection = (pair: string) => pair.replace(/-/g, '→');

// How many directions the ribbon names before the rest goes to the tooltip.
const TOP_N = 3;

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

// One line of the ribbon, named at its left edge so a number is never
// ambiguous about the window it covers. Narrow viewports swipe each line
// rather than wrapping it into a stack that would eat the tape's height.
const Row: React.FC<{
  tag: string;
  top?: boolean;
  children: React.ReactNode;
}> = ({ tag, top, children }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      height: ROW_H,
      minHeight: ROW_H,
      width: '100%',
      px: { xs: 0.25, sm: 0.75, md: 1.75 },
      borderTop: top ? 0 : '1px solid',
      borderColor: 'divider',
      overflowX: 'auto',
      overflowY: 'hidden',
      '&::-webkit-scrollbar': { display: 'none' },
      scrollbarWidth: 'none',
    }}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.54rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'text.disabled',
        whiteSpace: 'nowrap',
        // Both lines' first readout starts at the same x.
        width: { xs: 52, md: 60 },
        flexShrink: 0,
        pl: { xs: 1, md: 0.25 },
      }}
    >
      {tag}
    </Typography>
    {children}
  </Box>
);

// Estimated USD across backings when every hub is priced; otherwise the
// SOL-only figure, which is what the stats charts fall back to as well.
const usdOrSol = (
  usd: number | null,
  sol: number,
): { text: string; estimated: boolean } =>
  usd != null
    ? { text: formatUsd(usd), estimated: true }
    : { text: `${amount(sol)} SOL`, estimated: false };

/**
 * The network page's pinned status bar. Two lines that stay on screen no
 * matter how far down the page scrolls: the all-time levels the network has
 * reached, and what it did in the last 24 hours. The tape, the leaderboard
 * and the charts below are always read against the same numbers.
 */
const NetworkKpiStrip: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: overview, isLoading: overviewLoading } =
    useNetworkOverview('all');
  const { count: activeNodes, isLoading: nodesLoading } = useActiveNodeCount();
  // Hourly buckets over the trailing day — the same series the daily
  // activity charts read, at the resolution the ribbon summarises.
  const { data: day, isLoading: dayLoading } = useHistory('24h', 'hour');
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

  // Volume split by direction (asset sent -> asset received), biggest
  // first. Each direction is its own instrument, so SOL->TAO and TAO->SOL
  // stay separate rows rather than being pooled into one "pair".
  const pairMix = useMemo(
    () =>
      (overview?.pairMix ?? [])
        .map((p) => ({ ...p, pct: Number(p.pct) }))
        .sort((a, b) => b.pct - a.pct),
    [overview],
  );
  const topPairs = pairMix.slice(0, TOP_N);
  // USD counterpart for the tooltip's per-direction figures, when priced.
  const overviewVolumeUsd = usdFromBackingMap(
    overview?.volumeByBacking,
    prices,
    overview?.volumeSol ?? 0,
  );
  const pairsHint = pairMix.length
    ? `Share of all-time volume by direction (asset sent → asset received): ${pairMix
        .map(
          (p) =>
            `${p.pair.replace(/-/g, ' → ')} ${p.pct.toFixed(1)}%` +
            (overviewVolumeUsd != null
              ? ` (${formatUsd((p.pct / 100) * overviewVolumeUsd)})`
              : ''),
        )
        .join(' · ')}`
    : 'No completed volume yet, so no direction mix to rank.';

  // The trailing day, summed from its hourly buckets. Settlement is a mean
  // of means, so it is weighted by each bucket's swap count — an unweighted
  // average would let a one-swap hour count as much as a busy one.
  const last24 = useMemo(() => {
    const rows: HistoryRow[] = day ?? [];
    let swaps = 0;
    let volSol = 0;
    let volUsd: number | null = rows.length ? 0 : null;
    let feeSol = 0;
    let feeUsd: number | null = rows.length ? 0 : null;
    let settleWeighted = 0;
    let settleSwaps = 0;
    for (const r of rows) {
      swaps += r.swaps;
      volSol += lamportsToSol(r.volumeSol);
      feeSol += lamportsToSol(r.feesSol);
      const v = usdFromBackingMap(r.volumeByBacking, prices, r.volumeSol);
      const f = usdFromBackingMap(r.feesByBacking, prices, r.feesSol);
      // One unpriced bucket makes the whole USD total a guess, so drop it
      // rather than under-report the day.
      volUsd = v == null || volUsd == null ? null : volUsd + v;
      feeUsd = f == null || feeUsd == null ? null : feeUsd + f;
      if (r.avgSettlementSecs != null && r.swaps > 0) {
        settleWeighted += r.avgSettlementSecs * r.swaps;
        settleSwaps += r.swaps;
      }
    }
    return {
      swaps,
      vol: usdOrSol(volUsd, volSol),
      fees: usdOrSol(feeUsd, feeSol),
      // Swaps per second across the window, matching the throughput chart.
      tps: swaps / 86_400,
      settle: settleSwaps ? settleWeighted / settleSwaps : null,
    };
  }, [day, prices]);

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        flexShrink: 0,
        width: '100%',
        backgroundColor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Row tag="All time" top>
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
            overview
              ? `${(overview.networkSuccessRate * 100).toFixed(1)}%`
              : '—'
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
        <Readout
          label={`Top ${TOP_N} pairs`}
          value={
            topPairs.length ? (
              <Box
                component="span"
                sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 1 }}
              >
                {topPairs.map((p, i) => (
                  <Box
                    component="span"
                    key={p.pair}
                    sx={{ display: 'inline-flex', alignItems: 'baseline' }}
                  >
                    {i > 0 && (
                      <Box
                        component="span"
                        aria-hidden
                        sx={{ color: 'text.disabled', mr: 1 }}
                      >
                        ·
                      </Box>
                    )}
                    {fmtDirection(p.pair)}
                    <Box
                      component="span"
                      sx={{ color: 'text.secondary', fontWeight: 500, ml: 0.6 }}
                    >
                      {p.pct.toFixed(0)}%
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              '—'
            )
          }
          hint={pairsHint}
          loading={overviewLoading}
        />
      </Row>

      <Row tag="Last 24h">
        <Readout
          label="Volume"
          value={last24.vol.text}
          hint={
            last24.vol.estimated
              ? 'Volume completed in the last 24 hours, estimated in USD at current prices.'
              : 'Volume completed in the last 24 hours (SOL-backed legs only — no price feed for the other hubs).'
          }
          loading={dayLoading}
        />
        <Readout
          label="Txns"
          value={num(last24.swaps)}
          hint="Transactions completed in the last 24 hours."
          loading={dayLoading}
        />
        <Readout
          label="TPS"
          value={
            last24.tps === 0
              ? '0'
              : Number(last24.tps.toPrecision(2)).toString()
          }
          hint="Throughput over the last 24 hours: transactions completed ÷ seconds in the window."
          loading={dayLoading}
        />
        <Readout
          label="Settle"
          value={
            last24.settle == null ? '—' : formatDurationSecs(last24.settle)
          }
          hint="Average time from initiation to completion over the last 24 hours, weighted by each hour's transaction count."
          loading={dayLoading}
        />
        <Readout
          label="Fees"
          value={last24.fees.text}
          hint="Protocol fees taken in the last 24 hours: a flat 1% of volume, enforced at the smart contract level."
          loading={dayLoading}
        />
      </Row>
    </Box>
  );
};

export default NetworkKpiStrip;
