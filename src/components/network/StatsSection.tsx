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
  Panel,
  StatCell,
  TimeSeriesChart,
  type ChartSeries,
  type SeriesPoint,
} from '../stats';
import {
  useCompleteSwapHistory,
  useHistory,
  useActiveNodeCount,
  useNetworkOverview,
  useUsdPrices,
} from '../../api';
import type { HistoryRow } from '../../api/models';
import { hubChains } from '../../api/models/chains';
import {
  backingEntries,
  backingTooltip,
  chainSymbol,
  formatUsd,
  lamportsToSol,
  usdFromBackingMap,
} from '../../utils/format';
import { FONTS } from '../../theme';
import EmissionsByLane from './EmissionsByLane';

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

const usdCompact = (v: number) => `$${compact(v)}`;

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

const StatsSection: React.FC = () => {
  const theme = useTheme();

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

  const prices = useUsdPrices();
  // Volume/fee series render as estimated USD (the one legitimate
  // cross-backing sum) whenever every hub has a price; otherwise the legacy
  // SOL-only rendering (which silently drops TAO-backed flow) stays as the
  // fallback for a das that predates GET /prices.
  const usdMode = hubChains().every((h) => typeof prices[h] === 'number');

  const c = theme.palette;
  // All chart series use the theme-aware high-contrast foreground so lines are
  // light on dark mode and dark on light mode (no fixed blue/orange).
  const cPrimary = c.text.primary;
  const cBtc = c.text.primary;
  const cTao = c.text.primary;

  // --- Growth (cumulative) -------------------------------------------------
  const cumVolume = useMemo<ChartSeries[]>(
    () => [
      usdMode
        ? {
            name: 'Cumulative Volume',
            color: cPrimary,
            unit: 'USD',
            formatValue: formatUsd,
            points: histPoints(history, (r) =>
              usdFromBackingMap(
                r.cumulativeVolumeByBacking,
                prices,
                r.cumulativeVolumeSol,
              ),
            ),
          }
        : {
            name: 'Cumulative Volume',
            color: cPrimary,
            unit: 'SOL',
            formatValue: sol,
            points: histPoints(history, (r) =>
              lamportsToSol(r.cumulativeVolumeSol),
            ),
          },
    ],
    [history, cPrimary, usdMode, prices],
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
      usdMode
        ? {
            name: 'Volume / day',
            color: cBtc,
            type: 'bar' as const,
            unit: 'USD',
            formatValue: formatUsd,
            points: histPoints(history, (r) =>
              usdFromBackingMap(r.volumeByBacking, prices, r.volumeSol),
            ),
          }
        : {
            name: 'Volume / day',
            color: cBtc,
            type: 'bar' as const,
            unit: 'SOL',
            formatValue: sol,
            points: histPoints(history, (r) => lamportsToSol(r.volumeSol)),
          },
    ],
    [history, cBtc, usdMode, prices],
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

  // The median alongside the mean: one slow swap drags the average up a whole
  // day, the median holds at what a user actually waited. Undefined (not
  // null) on a das that predates the aggregate — an empty chart, not zeros.
  const medianSettlement = useMemo<ChartSeries[]>(
    () => [
      {
        name: 'Median settlement',
        color: cTao,
        unit: 's',
        formatValue: (v) => v.toFixed(1),
        points: histPoints(history, (r) => r.medianSettlementSecs ?? null),
      },
    ],
    [history, cTao],
  );

  // --- Protocol revenue: 1% of volume (cumulative line + per-day bars) -----
  const cumFees = useMemo<ChartSeries[]>(
    () => [
      usdMode
        ? {
            name: 'Cumulative Fees',
            color: cPrimary,
            unit: 'USD',
            formatValue: formatUsd,
            points: histPoints(history, (r) => {
              const vol = usdFromBackingMap(
                r.cumulativeVolumeByBacking,
                prices,
                r.cumulativeVolumeSol,
              );
              return vol == null ? null : vol * 0.01;
            }),
          }
        : {
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
    [history, cPrimary, usdMode, prices],
  );

  const fees = useMemo<ChartSeries[]>(
    () => [
      usdMode
        ? {
            name: 'Fees / day',
            color: cPrimary,
            type: 'bar' as const,
            unit: 'USD',
            formatValue: formatUsd,
            // The API reports the actual per-bucket fee take; only the
            // cumulative fee column is bogus on prod (see Stats.ts).
            points: histPoints(history, (r) =>
              usdFromBackingMap(r.feesByBacking, prices, r.feesSol),
            ),
          }
        : {
            name: 'Fees / day',
            color: cPrimary,
            type: 'bar' as const,
            unit: 'SOL',
            formatValue: (v) => v.toFixed(4),
            points: histPoints(history, (r) => lamportsToSol(r.feesSol)),
          },
    ],
    [history, cPrimary, usdMode, prices],
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
  // USD counterpart for the per-pair volume readout in the direction mix.
  const totalVolUsd = overview
    ? usdFromBackingMap(overview.volumeByBacking, prices, overview.volumeSol)
    : null;
  // "SOL-BTC" → "SOL → BTC" so the swap direction (input → output) is explicit.
  const fmtPair = (pair: string) => pair.replace(/-/g, ' → ');
  // Monochrome shades (theme-aware) so the breakdown bars stay distinguishable
  // without reintroducing fixed accent colors.
  const pairColor = (i: number) =>
    [c.text.primary, c.text.secondary, c.text.disabled][i % 3];

  // --- Top miners (optional mini-table) -----------------------------------
  // Ranked by estimated USD when prices are up — the SOL scalar alone
  // under-ranks TAO-heavy miners.
  const topMiners = useMemo(
    () =>
      (leaderboard ?? [])
        .slice()
        .sort((a, b) => {
          if (usdMode) {
            const aUsd =
              usdFromBackingMap(a.volumeByBacking, prices, a.volumeSol) ?? 0;
            const bUsd =
              usdFromBackingMap(b.volumeByBacking, prices, b.volumeSol) ?? 0;
            return bUsd - aUsd;
          }
          return parseFloat(b.volumeSol) - parseFloat(a.volumeSol);
        })
        .slice(0, 5),
    [leaderboard, usdMode, prices],
  );

  return (
    <Stack gap={3}>
      {/* 2. Growth over time */}
      <SectionTitle>Growth over time</SectionTitle>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Panel
            title="Cumulative Volume"
            subtitle={usdMode ? 'estimated USD, all-time' : 'SOL, all-time'}
            info={
              usdMode
                ? 'Running total of completed swap volume since launch, estimated in USD at current prices.'
                : 'Running total of completed swap volume (SOL) since launch.'
            }
          >
            <TimeSeriesChart
              daily
              series={cumVolume}
              loading={historyLoading}
              formatValue={usdMode ? usdCompact : compact}
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
          <Panel title="Transactions per day" info="Swaps completed each day.">
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
            subtitle={usdMode ? 'estimated USD' : 'SOL'}
            info={
              usdMode
                ? 'Swap volume completed each day, estimated in USD at current prices.'
                : 'Swap volume (SOL) completed each day.'
            }
          >
            <TimeSeriesChart
              daily
              series={dailyVolume}
              loading={historyLoading}
              formatValue={usdMode ? usdCompact : compact}
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
        <Grid item xs={12} md={6}>
          <Panel
            title="Median settlement time"
            subtitle="seconds (log scale)"
            info="Middle settlement time from swap initiation to completion each day — half of that day's swaps settled faster, half slower (log scale). Unlike the average, one slow swap doesn't move it."
          >
            <TimeSeriesChart
              daily
              series={medianSettlement}
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
            subtitle={
              usdMode
                ? '1% of volume, all-time (estimated USD)'
                : '1% of volume, all-time (SOL)'
            }
            info="Running total of protocol fees: a flat 1% of volume, enforced at the smart contract level."
          >
            <TimeSeriesChart
              daily
              series={cumFees}
              loading={historyLoading}
              formatValue={usdMode ? usdCompact : compact}
            />
          </Panel>
        </Grid>
        <Grid item xs={12} md={6}>
          <Panel
            title="Fees per day"
            subtitle={
              usdMode
                ? '1% of daily volume (estimated USD)'
                : '1% of daily volume (SOL)'
            }
            info="Protocol fees each day: a flat 1% of that day's volume, enforced at the smart contract level."
          >
            <TimeSeriesChart
              daily
              series={fees}
              loading={historyLoading}
              formatValue={usdMode ? usdCompact : (v: number) => v.toFixed(3)}
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
                        {totalVolUsd != null && totalVolUsd > 0
                          ? `  ·  ${formatUsd((p.pct / 100) * totalVolUsd)}`
                          : totalVol > 0 &&
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
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        UID {m.uid ?? '—'}
                        {m.isActive ? '' : ' (inactive)'}
                      </Box>
                      <Box
                        component="span"
                        title={
                          usdMode
                            ? backingTooltip(m.volumeByBacking, m.volumeSol)
                            : undefined
                        }
                        sx={{ color: 'text.primary' }}
                      >
                        {(() => {
                          const usd = usdMode
                            ? usdFromBackingMap(
                                m.volumeByBacking,
                                prices,
                                m.volumeSol,
                              )
                            : null;
                          return usd != null
                            ? formatUsd(usd)
                            : backingEntries(m.volumeByBacking, m.volumeSol)
                                .map(
                                  (e) =>
                                    `${sol(Number(e.amount))} ${chainSymbol(e.chain)}`,
                                )
                                .join(' + ');
                        })()}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Panel>
        </Grid>
        <Grid item xs={12}>
          <EmissionsByLane color={cPrimary} />
        </Grid>
      </Grid>
    </Stack>
  );
};

export default StatsSection;
