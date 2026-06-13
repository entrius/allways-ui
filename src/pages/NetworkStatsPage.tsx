import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Page,
  SEO,
  TimeSeriesChart,
  type ChartSeries,
  type SeriesPoint,
} from '../components';
import {
  useHistory,
  useHistoryState,
  useMinerLeaderboard,
  useNetworkOverview,
  useStats,
} from '../api';
import type { HistoryRow, HistoryStateRow } from '../api/models';
import { FONTS } from '../theme';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const num = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: 0 });

const tao = (v: number) =>
  v.toLocaleString(undefined, {
    maximumFractionDigits: v >= 1000 ? 0 : 2,
  });

const compact = (v: number) =>
  Math.abs(v) >= 1000
    ? `${(v / 1000).toFixed(1)}k`
    : v.toFixed(v >= 10 ? 0 : 1);

const ms = (iso: string) => new Date(iso).getTime();

// Map a HistoryRow series to chart points. `pick` returns the raw value
// (already a number or parsed from a money string) or null for a gap.
const histPoints = (
  rows: HistoryRow[] | undefined,
  pick: (r: HistoryRow) => number | null,
): SeriesPoint[] => (rows ?? []).map((r) => ({ t: ms(r.t), value: pick(r) }));

const statePoints = (
  rows: HistoryStateRow[] | undefined,
  pick: (r: HistoryStateRow) => number | null,
): SeriesPoint[] => (rows ?? []).map((r) => ({ t: ms(r.t), value: pick(r) }));

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

const Panel: React.FC<{
  title: string;
  subtitle?: string;
  /** Plain-language explanation shown in a tooltip on the title's info icon. */
  info?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, info, children }) => (
  <Box
    sx={{
      height: '100%',
      borderRadius: 0,
      border: '1px solid',
      borderColor: 'divider',
      backgroundColor: 'background.paper',
      p: { xs: 2, md: 2.5 },
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
      minWidth: 0,
    }}
  >
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
        {info && (
          <Tooltip title={info} arrow enterTouchDelay={0}>
            <InfoOutlinedIcon
              sx={{
                fontSize: '0.85rem',
                color: 'text.disabled',
                cursor: 'help',
                '&:hover': { color: 'text.secondary' },
              }}
            />
          </Tooltip>
        )}
      </Box>
      {subtitle && (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.62rem',
            color: 'text.secondary',
            mt: 0.25,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
    {children}
  </Box>
);

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

const StatCell: React.FC<{
  label: string;
  value: string;
  unit?: string;
  loading?: boolean;
}> = ({ label, value, unit, loading }) => (
  <Box
    sx={{
      borderRadius: 0,
      border: '1px solid',
      borderColor: 'divider',
      backgroundColor: 'background.paper',
      p: { xs: 2, md: 2.25 },
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      justifyContent: 'space-between',
    }}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.62rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {label}
    </Typography>
    <Box
      sx={{
        fontFamily: FONTS.mono,
        fontSize: { xs: '1.6rem', md: '2rem' },
        fontWeight: 700,
        lineHeight: 1,
        color: 'text.primary',
        display: 'flex',
        alignItems: 'baseline',
        gap: 0.5,
      }}
    >
      {loading ? (
        <Skeleton
          variant="rectangular"
          width={100}
          height={28}
          sx={{ bgcolor: 'action.hover' }}
        />
      ) : (
        <>
          {value}
          {unit && (
            <Box
              component="span"
              sx={{
                fontSize: { xs: '1rem', md: '1.25rem' },
                color: 'text.secondary',
                fontWeight: 500,
              }}
            >
              {unit}
            </Box>
          )}
        </>
      )}
    </Box>
  </Box>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NetworkStatsPage: React.FC = () => {
  const theme = useTheme();

  const { data: stats, isLoading: statsLoading } = useStats();
  // Single continuous all-time daily curve everywhere on this page.
  const { data: history, isLoading: historyLoading } = useHistory('all', 'day');
  const { data: stateHistory, isLoading: stateLoading } = useHistoryState(
    'all',
    'day',
  );
  // The daily /history/state bucket reports inFlight as-of the day's right edge
  // (≈0), not the day's peak. To approximate the PEAK concurrency hit each day
  // we sample hourly and take the max per day. (A true peak needs a backend
  // max-concurrency metric; hourly sampling undercounts short-lived bursts.)
  const { data: stateHourly, isLoading: stateHourlyLoading } = useHistoryState(
    'all',
    'hour',
  );
  const { data: overview, isLoading: overviewLoading } =
    useNetworkOverview('all');
  const { data: leaderboard, isLoading: leaderboardLoading } =
    useMinerLeaderboard('all');

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
        unit: 'τ',
        formatValue: tao,
        points: histPoints(history, (r) => parseFloat(r.cumulativeVolumeTao)),
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
        unit: 'τ',
        formatValue: tao,
        points: histPoints(history, (r) => parseFloat(r.volumeTao)),
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
        unit: 'τ',
        formatValue: tao,
        points: histPoints(
          history,
          (r) => parseFloat(r.cumulativeVolumeTao) * 0.01,
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
        unit: 'τ',
        formatValue: (v) => v.toFixed(4),
        points: histPoints(history, (r) => parseFloat(r.volumeTao) * 0.01),
      },
    ],
    [history, cPrimary],
  );

  // --- Network size --------------------------------------------------------
  const activeNodes = useMemo<ChartSeries[]>(
    () => [
      {
        name: 'Active nodes',
        color: cPrimary,
        formatValue: num,
        points: statePoints(stateHistory, (r) => r.activeNodes),
      },
    ],
    [stateHistory, cPrimary],
  );

  // Peak concurrent transactions per day = max of the hourly inFlight samples
  // within each calendar day.
  const peakInFlight = useMemo<ChartSeries[]>(() => {
    const byDay = new Map<string, number>();
    for (const r of stateHourly ?? []) {
      const day = r.t.slice(0, 10);
      byDay.set(day, Math.max(byDay.get(day) ?? 0, r.inFlight));
    }
    const points: SeriesPoint[] = [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, peak]) => ({
        t: new Date(`${day}T00:00:00Z`).getTime(),
        value: peak,
      }));
    return [
      {
        name: 'Peak concurrent',
        color: cBtc,
        type: 'bar',
        formatValue: num,
        points,
      },
    ];
  }, [stateHourly, cBtc]);

  // --- Composition: pair mix ----------------------------------------------
  const pairMix = overview?.pairMix ?? [];
  const totalVol = overview ? parseFloat(overview.volumeTao) : 0;
  // "TAO-BTC" → "TAO → BTC" so the swap direction (input → output) is explicit.
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
        .sort((a, b) => parseFloat(b.volumeTao) - parseFloat(a.volumeTao))
        .slice(0, 5),
    [leaderboard],
  );

  const volumeTotal = stats ? parseFloat(stats.totalVolumeTao) : 0;

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
              All-time daily history across the Allways network.
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
                value={tao(volumeTotal)}
                unit="τ"
                loading={statsLoading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCell
                label="Active Network Nodes"
                value={num(stats?.activeMiners ?? 0)}
                loading={statsLoading}
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
                subtitle="τ, all-time"
                info="Running total of completed swap volume (TAO) since launch."
              >
                <TimeSeriesChart
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
                  series={cumSwaps}
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
                  series={dailySwaps}
                  loading={historyLoading}
                  formatValue={num}
                />
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel
                title="Volume per day"
                subtitle="τ"
                info="Swap volume (TAO) completed each day."
              >
                <TimeSeriesChart
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
                  series={tps}
                  loading={historyLoading}
                  formatValue={(v) => v.toFixed(2)}
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
                subtitle="1% of volume, all-time (τ)"
                info="Running total of protocol fees: a flat 1% of volume, enforced at the smart contract level."
              >
                <TimeSeriesChart
                  series={cumFees}
                  loading={historyLoading}
                  formatValue={compact}
                />
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel
                title="Fees per day"
                subtitle="1% of daily volume (τ)"
                info="Protocol fees each day: a flat 1% of that day's volume, enforced at the smart contract level."
              >
                <TimeSeriesChart
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
                info="Active miner nodes on the network each day."
              >
                <TimeSeriesChart
                  series={activeNodes}
                  loading={stateLoading}
                  formatValue={num}
                />
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel
                title="Peak concurrent transactions"
                subtitle="max in-flight hit per day"
                info="The most swaps in-flight at once each day (sampled hourly)."
              >
                <TimeSeriesChart
                  series={peakInFlight}
                  loading={stateHourlyLoading}
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
                              `  ·  ${tao((p.pct / 100) * totalVol)} τ`}
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
                      value={num(overview?.activeMiners ?? 0)}
                      loading={overviewLoading}
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
                            UID {m.uid}
                            {m.isActive ? '' : ' (inactive)'}
                          </Box>
                          <Box component="span" sx={{ color: 'text.primary' }}>
                            {tao(parseFloat(m.volumeTao))} τ
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
