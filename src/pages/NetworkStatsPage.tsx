import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Page,
  Panel,
  SEO,
  StatCell,
  TimeSeriesChart,
  type ChartSeries,
  type SeriesPoint,
} from '../components';
import {
  useCompleteSwapHistory,
  useHistory,
  useActiveNodeCount,
  useNetworkOverview,
  useStats,
} from '../api';
import type { HistoryRow } from '../api/models';
import { lamportsToSol } from '../utils/format';
import { FONTS } from '../theme';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const num = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: 0 });

const sol = (v: number) =>
  v.toLocaleString(undefined, {
    maximumFractionDigits: v >= 1000 ? 0 : 2,
  });

const compact = (v: number) =>
  Math.abs(v) >= 1000
    ? `${(v / 1000).toFixed(1)}k`
    : v >= 10
      ? v.toFixed(0)
      : // Two significant figures so sub-1 axis values stay distinct
        // instead of collapsing to a column of "0.0"s.
        Number(v.toPrecision(2)).toString();

const ms = (iso: string) => new Date(iso).getTime();

// Map a HistoryRow series to chart points. `pick` returns the raw value
// (already a number or parsed from a money string) or null for a gap.
const histPoints = (
  rows: HistoryRow[] | undefined,
  pick: (r: HistoryRow) => number | null,
): SeriesPoint[] => (rows ?? []).map((r) => ({ t: ms(r.t), value: pick(r) }));

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Typography
    sx={{
      fontFamily: FONTS.mono,
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'text.secondary',
      mt: 1,
    }}
  >
    {children}
  </Typography>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NetworkStatsPage: React.FC = () => {
  const theme = useTheme();

  const { data: stats, isLoading: statsLoading } = useStats();
  // Single continuous all-time daily curve everywhere on this page.
  const { data: history, isLoading: historyLoading } = useHistory('all', 'day');
  const { data: allSwaps, isLoading: swapsLoading } = useCompleteSwapHistory();
  const { data: overview, isLoading: overviewLoading } =
    useNetworkOverview('all');
  const {
    data: leaderboard,
    isLoading: leaderboardLoading,
    count: distinctActiveNodes,
  } = useActiveNodeCount();

  const c = theme.palette;
  // All chart series use the theme-aware high-contrast foreground so lines are
  // light on dark mode and dark on light mode (no fixed blue/orange).
  const cPrimary = c.text.primary;
  const cBtc = c.text.primary;
  const cTao = c.text.primary;

  // --- Growth (cumulative) -------------------------------------------------
  const cumVolume = useMemo<ChartSeries[]>(
    () => [
      {
        name: 'Cumulative Volume',
        color: cPrimary,
        unit: 'SOL',
        formatValue: sol,
        points: histPoints(history, (r) =>
          lamportsToSol(r.cumulativeVolumeSol),
        ),
      },
    ],
    [history, cPrimary],
  );

  const cumSwaps = useMemo<ChartSeries[]>(
    () => [
      {
        name: 'Cumulative Transactions',
        color: cBtc,
        formatValue: num,
        points: histPoints(history, (r) => r.cumulativeSwaps),
      },
    ],
    [history, cBtc],
  );

  // --- Daily activity ------------------------------------------------------
  const dailySwaps = useMemo<ChartSeries[]>(
    () => [
      {
        name: 'Transactions / day',
        color: cPrimary,
        type: 'bar',
        formatValue: num,
        points: histPoints(history, (r) => r.swaps),
      },
    ],
    [history, cPrimary],
  );

  const dailyVolume = useMemo<ChartSeries[]>(
    () => [
      {
        name: 'Volume / day',
        color: cBtc,
        type: 'bar',
        unit: 'SOL',
        formatValue: sol,
        points: histPoints(history, (r) => lamportsToSol(r.volumeSol)),
      },
    ],
    [history, cBtc],
  );

  // --- Throughput & reliability -------------------------------------------
  const tps = useMemo<ChartSeries[]>(
    () => [
      {
        name: 'TPS',
        color: cPrimary,
        formatValue: (v) => v.toFixed(3),
        points: histPoints(history, (r) => r.tps),
      },
    ],
    [history, cPrimary],
  );

  const successRate = useMemo<ChartSeries[]>(
    () => [
      {
        name: 'Success rate',
        color: cBtc,
        unit: '%',
        formatValue: (v) => v.toFixed(1),
        // Null buckets become gaps (no completed swaps that day).
        points: histPoints(history, (r) =>
          r.successRate == null ? null : r.successRate * 100,
        ),
      },
    ],
    [history, cBtc],
  );

  const settlement = useMemo<ChartSeries[]>(
    () => [
      {
        name: 'Avg settlement',
        color: cTao,
        unit: 's',
        formatValue: (v) => v.toFixed(1),
        points: histPoints(history, (r) => r.avgSettlementSecs),
      },
    ],
    [history, cTao],
  );

  // --- Protocol revenue: 1% of volume (cumulative line + per-day bars) -----
  const cumFees = useMemo<ChartSeries[]>(
    () => [
      {
        name: 'Cumulative Fees',
        color: cPrimary,
        unit: 'SOL',
        formatValue: sol,
        points: histPoints(
          history,
          (r) => lamportsToSol(r.cumulativeVolumeSol) * 0.01,
        ),
      },
    ],
    [history, cPrimary],
  );

  const fees = useMemo<ChartSeries[]>(
    () => [
      {
        name: 'Fees / day',
        color: cPrimary,
        type: 'bar',
        unit: 'SOL',
        formatValue: (v) => v.toFixed(4),
        // The API reports the actual per-bucket fee take; only the
        // cumulative fee column is bogus on prod (see Stats.ts).
        points: histPoints(history, (r) => lamportsToSol(r.feesSol)),
      },
    ],
    [history, cPrimary],
  );

  // --- Network size --------------------------------------------------------
  // Both charts derive from raw swap [initiatedAt, resolvedAt] intervals.
  // /history/state can't back either: its activeNodes replays a contract
  // event stream that misses most activations (it reported 4 nodes while the
  // miners table had 5 active hotkeys), and its inFlight is sampled at bucket
  // edges, missing swaps that settle within a bucket entirely.
  const { activeNodes, peakInFlight } = useMemo(() => {
    const DAY_MS = 86_400_000;
    const dayOf = (secs: number) => Math.floor((secs * 1000) / DAY_MS) * DAY_MS;
    const nowSecs = Date.now() / 1000;

    const swaps = (allSwaps ?? []).filter((s) => s.initiatedAt != null);
    // Distinct nodes that served a swap, keyed by the initiation day.
    const servingByDay = new Map<number, Set<string>>();
    // +1 at initiation, -1 at resolution (open swaps run to "now"); sweeping
    // in time order tracks exact concurrency. Day boundaries get zero-delta
    // checkpoints so a swap spanning a whole quiet day still registers there.
    const sweep: [number, number][] = [];
    for (const s of swaps) {
      const start = Number(s.initiatedAt);
      const end = s.resolvedAt == null ? nowSecs : Number(s.resolvedAt);
      sweep.push([start, 1], [end, -1]);
      if (s.minerHotkey) {
        const day = dayOf(start);
        let set = servingByDay.get(day);
        if (!set) servingByDay.set(day, (set = new Set()));
        set.add(s.minerHotkey);
      }
    }
    const empty = {
      activeNodes: [] as ChartSeries[],
      peakInFlight: [] as ChartSeries[],
    };
    if (!sweep.length) return empty;

    const firstDay = dayOf(Math.min(...sweep.map(([t]) => t)));
    const today = dayOf(nowSecs);
    const days: number[] = [];
    for (let t = firstDay; t <= today; t += DAY_MS) {
      days.push(t);
      sweep.push([t / 1000, 0]);
    }
    // Starts before ends at the same instant, so back-to-back swaps count as
    // overlapping rather than dipping to zero between them.
    sweep.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const peakByDay = new Map<number, number>();
    let open = 0;
    for (const [ts, delta] of sweep) {
      open += delta;
      const day = dayOf(ts);
      peakByDay.set(day, Math.max(peakByDay.get(day) ?? 0, open));
    }

    return {
      activeNodes: [
        {
          name: 'Serving nodes',
          color: cPrimary,
          formatValue: num,
          points: days.map((t) => ({
            t,
            value: servingByDay.get(t)?.size ?? 0,
          })),
        },
      ] as ChartSeries[],
      peakInFlight: [
        {
          name: 'Peak concurrent',
          color: cBtc,
          type: 'bar',
          formatValue: num,
          points: days.map((t) => ({ t, value: peakByDay.get(t) ?? 0 })),
        },
      ] as ChartSeries[],
    };
  }, [allSwaps, cPrimary, cBtc]);

  // --- Composition: pair mix ----------------------------------------------
  // pct arrives as a string when json-bigint deems the float too precise
  // (ApiUtils parses long numbers as strings), so coerce before .toFixed().
  const pairMix = (overview?.pairMix ?? []).map((p) => ({
    ...p,
    pct: Number(p.pct),
  }));
  const totalVol = overview ? lamportsToSol(overview.volumeSol) : 0;
  // "SOL-BTC" → "SOL → BTC" so the swap direction (input → output) is explicit.
  const fmtPair = (pair: string) => pair.replace(/-/g, ' → ');
  // Monochrome shades (theme-aware) so the breakdown bars stay distinguishable
  // without reintroducing fixed accent colors.
  const pairColor = (i: number) =>
    [c.text.primary, c.text.secondary, c.text.disabled][i % 3];

  // --- Top miners (optional mini-table) -----------------------------------
  const topMiners = useMemo(
    () =>
      (leaderboard ?? [])
        .slice()
        .sort((a, b) => parseFloat(b.volumeSol) - parseFloat(a.volumeSol))
        .slice(0, 5),
    [leaderboard],
  );

  const volumeTotal = stats ? lamportsToSol(stats.totalVolumeSol) : 0;

  return (
    <Page title="Network Stats">
      <SEO
        title="Network Stats"
        description="All-time growth, activity, throughput, revenue and network size for Allways — Bittensor SN7"
      />
      <Box
        sx={{
          backgroundColor: 'background.default',
          px: { xs: 1.5, sm: 2, md: 3 },
          py: { xs: 2, md: 3 },
          width: '100%',
          maxWidth: 1400,
          mx: 'auto',
        }}
      >
        <Stack gap={3}>
          {/* Header */}
          <Box>
            <Typography
              sx={{
                fontFamily: FONTS.heading,
                fontWeight: 900,
                fontSize: { xs: '1.5rem', md: '2rem' },
                letterSpacing: '0.02em',
              }}
            >
              Network Stats
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.72rem',
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              All-time daily history across the Allways network. UTC days —
              today&apos;s bucket is still filling.
            </Typography>
          </Box>

          {/* 1. Snapshot row */}
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <StatCell
                label="Successful Transactions"
                value={num(stats?.totalSwaps ?? 0)}
                loading={statsLoading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCell
                label="Volume"
                value={sol(volumeTotal)}
                unit="SOL"
                loading={statsLoading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCell
                label="Active Network Nodes"
                value={num(distinctActiveNodes)}
                loading={leaderboardLoading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCell
                label="Active Transactions"
                value={num(stats?.activeSwaps ?? 0)}
                loading={statsLoading}
              />
            </Grid>
          </Grid>

          {/* 2. Growth over time */}
          <SectionTitle>Growth over time</SectionTitle>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Panel
                title="Cumulative Volume"
                subtitle="SOL, all-time"
                info="Running total of completed swap volume (SOL) since launch."
              >
                <TimeSeriesChart
                  daily
                  series={cumVolume}
                  loading={historyLoading}
                  formatValue={compact}
                />
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel
                title="Cumulative Transactions"
                subtitle="count, all-time"
                info="Running total of successfully completed swaps since launch."
              >
                <TimeSeriesChart
                  daily
                  series={cumSwaps}
                  integerY
                  loading={historyLoading}
                  formatValue={compact}
                />
              </Panel>
            </Grid>
          </Grid>

          {/* 3. Daily activity */}
          <SectionTitle>Daily activity</SectionTitle>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Panel
                title="Transactions per day"
                info="Swaps completed each day."
              >
                <TimeSeriesChart
                  daily
                  series={dailySwaps}
                  integerY
                  loading={historyLoading}
                  formatValue={num}
                />
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel
                title="Volume per day"
                subtitle="SOL"
                info="Swap volume (SOL) completed each day."
              >
                <TimeSeriesChart
                  daily
                  series={dailyVolume}
                  loading={historyLoading}
                  formatValue={compact}
                />
              </Panel>
            </Grid>
          </Grid>

          {/* 4. Throughput & reliability */}
          <SectionTitle>Throughput &amp; reliability</SectionTitle>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Panel
                title="Throughput"
                subtitle="transactions per second"
                info="Average swaps per second each day (daily swaps ÷ seconds in the day)."
              >
                <TimeSeriesChart
                  daily
                  series={tps}
                  loading={historyLoading}
                  formatValue={(v) =>
                    v === 0 ? '0' : Number(v.toPrecision(2)).toString()
                  }
                />
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel
                title="Success rate"
                subtitle="% completed (null days gapped)"
                info="Share of resolved swaps that completed successfully each day: completed / (completed + timed-out)."
              >
                <TimeSeriesChart
                  daily
                  series={successRate}
                  loading={historyLoading}
                  formatValue={(v) => `${v.toFixed(0)}`}
                />
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel
                title="Average settlement time"
                subtitle="seconds (log scale)"
                info="Average time from swap initiation to completion each day (log scale)."
              >
                <TimeSeriesChart
                  daily
                  series={settlement}
                  loading={historyLoading}
                  formatValue={(v) => v.toFixed(0)}
                  logScale
                />
              </Panel>
            </Grid>
          </Grid>

          {/* 5. Protocol revenue */}
          <SectionTitle>Protocol revenue</SectionTitle>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Panel
                title="Cumulative Fees"
                subtitle="1% of volume, all-time (SOL)"
                info="Running total of protocol fees: a flat 1% of volume, enforced at the smart contract level."
              >
                <TimeSeriesChart
                  daily
                  series={cumFees}
                  loading={historyLoading}
                  formatValue={compact}
                />
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel
                title="Fees per day"
                subtitle="1% of daily volume (SOL)"
                info="Protocol fees each day: a flat 1% of that day's volume, enforced at the smart contract level."
              >
                <TimeSeriesChart
                  daily
                  series={fees}
                  loading={historyLoading}
                  formatValue={(v) => v.toFixed(3)}
                />
              </Panel>
            </Grid>
          </Grid>

          {/* 6. Network size */}
          <SectionTitle>Network size</SectionTitle>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Panel
                title="Active nodes over time"
                subtitle="distinct nodes serving swaps each day"
                info="How many distinct nodes served at least one swap each day."
              >
                <TimeSeriesChart
                  daily
                  series={activeNodes}
                  integerY
                  loading={swapsLoading}
                  formatValue={num}
                />
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel
                title="Peak concurrent transactions"
                subtitle="max in-flight hit per day"
                info="The most swaps in-flight at once each day, computed exactly from every swap's initiation and resolution times."
              >
                <TimeSeriesChart
                  daily
                  series={peakInFlight}
                  integerY
                  loading={swapsLoading}
                  formatValue={num}
                />
              </Panel>
            </Grid>
          </Grid>

          {/* 7. Composition / current */}
          <SectionTitle>Composition &amp; current</SectionTitle>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Panel
                title="Direction mix"
                subtitle="share of all-time volume, by swap direction (input → output)"
                info="How all-time volume splits by swap direction (asset sent → asset received)."
              >
                {overviewLoading ? (
                  <Stack gap={1.5} sx={{ mt: 1 }}>
                    {[0, 1].map((i) => (
                      <Skeleton
                        key={i}
                        variant="rectangular"
                        height={28}
                        sx={{ bgcolor: 'action.hover' }}
                      />
                    ))}
                  </Stack>
                ) : pairMix.length === 0 ? (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.7rem',
                      color: 'text.disabled',
                      py: 2,
                    }}
                  >
                    no pair data yet
                  </Typography>
                ) : (
                  <Stack gap={1.25} sx={{ mt: 1 }}>
                    {pairMix.map((p, i) => (
                      <Box key={p.pair}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: FONTS.mono,
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: 'text.primary',
                            }}
                          >
                            {fmtPair(p.pair)}
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: FONTS.mono,
                              fontSize: '0.72rem',
                              color: 'text.secondary',
                            }}
                          >
                            <Box
                              component="span"
                              sx={{ color: 'text.primary', fontWeight: 600 }}
                            >
                              {p.pct.toFixed(1)}%
                            </Box>
                            {totalVol > 0 &&
                              `  ·  ${sol((p.pct / 100) * totalVol)} SOL`}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            height: 8,
                            width: '100%',
                            backgroundColor: 'action.hover',
                            borderRadius: 0,
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${Math.min(100, p.pct)}%`,
                              backgroundColor: pairColor(i),
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel
                title="Current overview"
                info="Current network success rate and active miner count, with top miners by all-time volume."
              >
                <Grid container spacing={2} sx={{ mt: 0 }}>
                  <Grid item xs={6}>
                    <StatCell
                      label="Network success rate"
                      value={
                        overview
                          ? (overview.networkSuccessRate * 100).toFixed(1)
                          : '0'
                      }
                      unit="%"
                      loading={overviewLoading}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <StatCell
                      label="Active miners"
                      value={num(distinctActiveNodes)}
                      loading={leaderboardLoading}
                    />
                  </Grid>
                </Grid>

                {/* Optional: top miners by volume */}
                <Box sx={{ mt: 2 }}>
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.62rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      mb: 1,
                    }}
                  >
                    Top miners by volume
                  </Typography>
                  {leaderboardLoading ? (
                    <Stack gap={0.75}>
                      {[0, 1, 2].map((i) => (
                        <Skeleton
                          key={i}
                          variant="rectangular"
                          height={20}
                          sx={{ bgcolor: 'action.hover' }}
                        />
                      ))}
                    </Stack>
                  ) : topMiners.length === 0 ? (
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.7rem',
                        color: 'text.disabled',
                      }}
                    >
                      no miners yet
                    </Typography>
                  ) : (
                    <Stack gap={0.5}>
                      {topMiners.map((m) => (
                        <Box
                          key={m.hotkey}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            fontFamily: FONTS.mono,
                            fontSize: '0.72rem',
                            py: 0.25,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box
                            component="span"
                            sx={{ color: 'text.secondary' }}
                          >
                            UID {m.uid ?? '—'}
                            {m.isActive ? '' : ' (inactive)'}
                          </Box>
                          <Box component="span" sx={{ color: 'text.primary' }}>
                            {sol(lamportsToSol(m.volumeSol))} SOL
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Panel>
            </Grid>
          </Grid>
        </Stack>
      </Box>
    </Page>
  );
};

export default NetworkStatsPage;
