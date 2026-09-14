import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import {
  Panel,
  StatCell,
  TimeSeriesChart,
  type ChartSeries,
  type SeriesPoint,
} from '../stats';
import RangeChips from '../RangeChips';
import {
  useCompleteSwapHistory,
  useHistory,
  useStats,
  useUsdPrices,
  type HistoryRange,
} from '../../api';
import type { ActiveSwap, HistoryRow } from '../../api/models';
import { assetLabel, hubChains } from '../../api/models/chains';
import {
  backingTooltip,
  formatUsd,
  lamportsToSol,
  unitsToHuman,
  usdFromBackingMap,
} from '../../utils/format';
import { FONTS } from '../../theme';

/**
 * Every figure about the network as a whole, most important first: the
 * all-time totals as a row of tiles (volume, transactions, fees, reliability,
 * speed, size), then the same things over time as charts, in the same
 * order. One lookback (`7d`, `30d`, `all`) drives every chart and is kept in
 * the URL as `statsRange` beside the tape's filters and the miners' ranges,
 * so a link restores the whole page. The tiles are always all-time.
 *
 * Sources: `/stats` for the totals (the only endpoint whose "all" really is
 * all-time; `/network/overview` caps at 30d), `/history` for the daily
 * buckets, and the full tape for what no aggregate carries: exact success
 * and settlement figures, nodes serving per day, peak concurrency, and the
 * volume split by direction.
 */

const RANGES = ['7d', '30d', 'all'] as const;
type StatsRange = (typeof RANGES)[number];
const isStatsRange = (v: string | null): v is StatsRange =>
  RANGES.includes(v as StatsRange);
const DEFAULT_RANGE: StatsRange = '30d';
export const STATS_RANGE_PARAM = 'statsRange';
const RANGE_DAYS: Record<StatsRange, number | null> = {
  '7d': 7,
  '30d': 30,
  all: null,
};

const DAY_MS = 86_400_000;
const dayOf = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;

// Short axis ticks: 1.2k, 340, 0.45.
const compact = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}m`
    : Math.abs(v) >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : v >= 10
        ? v.toFixed(0)
        : Number(v.toPrecision(2)).toString();

const usdCompact = (v: number) => `$${compact(v)}`;

const count = (v: number) => Math.round(v).toString();

const solAmount = (v: number) =>
  v >= 100
    ? v.toFixed(0)
    : v >= 1
      ? v.toFixed(2)
      : Number(v.toPrecision(3)).toString();

// Seconds up to ten minutes, minutes up to ten hours, then hours: "66s",
// "4.5m", "2.8h".
const secs = (v: number) =>
  v >= 36_000
    ? `${(v / 3600).toFixed(1)}h`
    : v >= 600
      ? `${(v / 60).toFixed(v >= 6000 ? 0 : 1)}m`
      : `${v.toFixed(v >= 10 ? 0 : 1)}s`;

const pctValue = (v: number) => `${v.toFixed(1)}%`;

const ms = (iso: string) => new Date(iso).getTime();

const points = (
  rows: HistoryRow[] | undefined,
  pick: (r: HistoryRow) => number | null,
) => (rows ?? []).map((r) => ({ t: ms(r.t), value: pick(r) }));

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const mono = {
  fontFamily: FONTS.mono,
  fontSize: '0.72rem',
  fontVariantNumeric: 'tabular-nums',
};

/** "SOL → BTC" from the swap's own legs. */
const directionLabel = (s: ActiveSwap) =>
  `${assetLabel(s.sourceChain ?? '')} → ${assetLabel(s.destChain ?? '')}`;

const StatsSection: React.FC = () => {
  const theme = useTheme();
  const ink = theme.palette.text.primary;
  const [params, setParams] = useSearchParams();
  const rangeParam = params.get(STATS_RANGE_PARAM);
  const range: StatsRange = isStatsRange(rangeParam)
    ? rangeParam
    : DEFAULT_RANGE;
  const setRange = (next: StatsRange) => {
    const nextParams = new URLSearchParams(params);
    if (next === DEFAULT_RANGE) nextParams.delete(STATS_RANGE_PARAM);
    else nextParams.set(STATS_RANGE_PARAM, next);
    setParams(nextParams, { replace: true });
  };

  // Daily buckets for every lookback, so each column is one UTC day and the
  // charts read the same way at 7d and all-time.
  const { data: history, isLoading: historyLoading } = useHistory(
    range as HistoryRange,
    'day',
  );
  const { data: totals, isLoading: totalsLoading } = useStats();
  const { data: allSwaps, isLoading: swapsLoading } = useCompleteSwapHistory();

  const prices = useUsdPrices();
  // Volume and fees render as estimated USD (the one legitimate sum across
  // backings) whenever every hub has a price; otherwise the SOL-only figure,
  // which leaves TAO-backed flow out and says so in the subtitle.
  const usdMode = hubChains().every((h) => typeof prices[h] === 'number');
  const money = usdMode ? 'estimated USD' : 'SOL only';
  const moneyTick = usdMode ? usdCompact : compact;
  const moneyValue = usdMode ? formatUsd : solAmount;

  // --- All-time totals ----------------------------------------------------
  const totalVolumeUsd = totals
    ? usdFromBackingMap(
        totals.totalVolumeByBacking,
        prices,
        totals.totalVolumeSol,
      )
    : null;
  const totalVolumeSol = totals ? lamportsToSol(totals.totalVolumeSol) : 0;
  const volumeTooltip = totals
    ? backingTooltip(totals.totalVolumeByBacking, totals.totalVolumeSol)
    : undefined;

  // Exact all-time reliability and speed, from every resolved swap.
  const tape = useMemo(() => {
    const swaps = allSwaps ?? [];
    let completed = 0;
    let timedOut = 0;
    const settle: number[] = [];
    const nodes = new Set<string>();
    for (const s of swaps) {
      if (s.status === 'COMPLETED') {
        completed += 1;
        if (s.minerHotkey) nodes.add(s.minerHotkey);
        if (s.initiatedAt != null && s.resolvedAt != null) {
          settle.push(Number(s.resolvedAt) - Number(s.initiatedAt));
        }
      } else if (s.status === 'TIMED_OUT') {
        timedOut += 1;
      }
    }
    const resolved = completed + timedOut;
    return {
      successRate: resolved ? (completed / resolved) * 100 : null,
      medianSettle: median(settle),
      avgSettle: settle.length
        ? settle.reduce((a, b) => a + b, 0) / settle.length
        : null,
      nodesEver: nodes.size,
    };
  }, [allSwaps]);

  // --- History charts -----------------------------------------------------
  const volume = (r: HistoryRow) =>
    usdMode
      ? usdFromBackingMap(r.volumeByBacking, prices, r.volumeSol)
      : lamportsToSol(r.volumeSol);
  const cumulativeVolume = (r: HistoryRow) =>
    usdMode
      ? usdFromBackingMap(
          r.cumulativeVolumeByBacking,
          prices,
          r.cumulativeVolumeSol,
        )
      : lamportsToSol(r.cumulativeVolumeSol);
  const fees = (r: HistoryRow) =>
    usdMode
      ? usdFromBackingMap(r.feesByBacking, prices, r.feesSol)
      : lamportsToSol(r.feesSol);

  const series = useMemo(() => {
    const line = (
      name: string,
      pick: (r: HistoryRow) => number | null,
      extra: Partial<ChartSeries> = {},
    ): ChartSeries[] => [
      { name, color: ink, points: points(history, pick), ...extra },
    ];
    const bars = (
      name: string,
      pick: (r: HistoryRow) => number | null,
      extra: Partial<ChartSeries> = {},
    ): ChartSeries[] => line(name, pick, { type: 'bar', ...extra });

    return {
      cumulativeVolume: line('Cumulative volume', cumulativeVolume, {
        formatValue: moneyValue,
      }),
      cumulativeTransactions: line(
        'Cumulative transactions',
        (r) => r.cumulativeSwaps,
        { formatValue: count },
      ),
      volume: bars('Volume', volume, { formatValue: moneyValue }),
      transactions: bars('Transactions', (r) => r.swaps, {
        formatValue: count,
      }),
      cumulativeFees: line(
        'Cumulative fees',
        // The API's cumulative fee column carries a seed offset on prod
        // (see Stats.ts); fees are a flat 1% of volume, so derive them.
        (r) => {
          const v = cumulativeVolume(r);
          return v == null ? null : v * 0.01;
        },
        { formatValue: moneyValue },
      ),
      fees: bars('Fees', fees, { formatValue: moneyValue }),
      successRate: line(
        'Success rate',
        (r) => (r.successRate == null ? null : r.successRate * 100),
        { formatValue: pctValue },
      ),
      settlement: [
        ...line('Median', (r) => r.medianSettlementSecs ?? null, {
          formatValue: secs,
        }),
        ...line('Average', (r) => r.avgSettlementSecs, {
          formatValue: secs,
          dashed: true,
        }),
      ],
      throughput: line('Transactions / hour', (r) => r.tps * 3600, {
        formatValue: (v) => v.toFixed(2),
      }),
    };
    // The pickers close over usdMode and prices, which are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, ink, usdMode, prices]);

  // --- Tape-derived charts ------------------------------------------------
  // Serving nodes and peak concurrency per day come from each swap's
  // [initiatedAt, resolvedAt] interval; no aggregate carries them. The
  // direction split uses each swap's backing-leg notional, priced.
  const derived = useMemo(() => {
    const swaps = (allSwaps ?? []).filter((s) => s.initiatedAt != null);
    const nowMs = Date.now();
    const days = RANGE_DAYS[range];
    const sinceMs = days == null ? 0 : dayOf(nowMs) - (days - 1) * DAY_MS;

    const servingByDay = new Map<number, Set<string>>();
    // +1 at initiation, -1 at resolution (open swaps run to now); a sweep in
    // time order tracks exact concurrency. Day boundaries get zero-delta
    // checkpoints so a swap spanning a quiet day still registers there.
    const sweep: [number, number][] = [];
    const byDirection = new Map<string, number>();
    let firstMs = Infinity;
    for (const s of swaps) {
      const start = Number(s.initiatedAt) * 1000;
      const end = s.resolvedAt == null ? nowMs : Number(s.resolvedAt) * 1000;
      firstMs = Math.min(firstMs, start);
      sweep.push([start, 1], [end, -1]);
      if (start < sinceMs) continue;
      if (s.status === 'COMPLETED' && s.minerHotkey) {
        const day = dayOf(start);
        let set = servingByDay.get(day);
        if (!set) servingByDay.set(day, (set = new Set()));
        set.add(s.minerHotkey);
      }
      if (s.status === 'COMPLETED' && s.solAmount != null && usdMode) {
        const backing = s.backing ?? 'sol';
        const price = prices[backing];
        if (typeof price === 'number') {
          const usd = unitsToHuman(s.solAmount, backing) * price;
          const key = directionLabel(s);
          byDirection.set(key, (byDirection.get(key) ?? 0) + usd);
        }
      }
    }
    const empty = {
      servingNodes: [] as ChartSeries[],
      peakInFlight: [] as ChartSeries[],
      mix: [] as { label: string; usd: number; pct: number }[],
    };
    if (!sweep.length) return empty;

    const firstDay = Math.max(dayOf(firstMs), sinceMs);
    const today = dayOf(nowMs);
    const dayList: number[] = [];
    for (let t = firstDay; t <= today; t += DAY_MS) {
      dayList.push(t);
      sweep.push([t, 0]);
    }
    // Starts before ends at the same instant, so back-to-back swaps count as
    // overlapping rather than dipping to zero between them.
    sweep.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const peakByDay = new Map<number, number>();
    let open = 0;
    for (const [t, delta] of sweep) {
      open += delta;
      const day = dayOf(t);
      peakByDay.set(day, Math.max(peakByDay.get(day) ?? 0, open));
    }

    const mixTotal = [...byDirection.values()].reduce((a, b) => a + b, 0);
    const mix = [...byDirection.entries()]
      .map(([label, usd]) => ({
        label,
        usd,
        pct: mixTotal ? (usd / mixTotal) * 100 : 0,
      }))
      .sort((a, b) => b.usd - a.usd);

    const daily = (pick: (t: number) => number): SeriesPoint[] =>
      dayList.map((t) => ({ t, value: pick(t) }));
    return {
      servingNodes: [
        {
          name: 'Serving nodes',
          color: ink,
          formatValue: count,
          points: daily((t) => servingByDay.get(t)?.size ?? 0),
        },
      ] as ChartSeries[],
      peakInFlight: [
        {
          name: 'Peak concurrent',
          color: ink,
          type: 'bar',
          formatValue: count,
          points: daily((t) => peakByDay.get(t) ?? 0),
        },
      ] as ChartSeries[],
      mix,
    };
  }, [allSwaps, range, ink, usdMode, prices]);

  const chart = (
    data: ChartSeries[],
    loading: boolean,
    format: (v: number) => string,
    extra: Partial<React.ComponentProps<typeof TimeSeriesChart>> = {},
  ) => (
    <TimeSeriesChart
      daily
      series={data}
      loading={loading}
      formatValue={format}
      emptyLabel="no completed transactions in this range"
      {...extra}
    />
  );

  const tiles: {
    label: string;
    value: string;
    unit?: string;
    loading: boolean;
    tooltip?: string;
  }[] = [
    {
      label: 'Total volume',
      value:
        totalVolumeUsd != null
          ? formatUsd(totalVolumeUsd)
          : `${solAmount(totalVolumeSol)}`,
      unit: totalVolumeUsd != null ? undefined : 'SOL',
      loading: totalsLoading,
      tooltip: volumeTooltip,
    },
    {
      label: 'Total transactions',
      value: totals ? count(totals.totalSwaps) : '0',
      loading: totalsLoading,
    },
    {
      label: 'Protocol fees',
      value:
        totalVolumeUsd != null
          ? formatUsd(totalVolumeUsd * 0.01)
          : `${solAmount(totalVolumeSol * 0.01)}`,
      unit: totalVolumeUsd != null ? undefined : 'SOL',
      loading: totalsLoading,
      tooltip: '1% of total volume',
    },
    {
      label: 'Success rate',
      value: tape.successRate == null ? '—' : tape.successRate.toFixed(1),
      unit: tape.successRate == null ? undefined : '%',
      loading: swapsLoading,
      tooltip: 'completed / (completed + timed out), every resolved swap',
    },
    {
      label: 'Median settlement',
      value: tape.medianSettle == null ? '—' : secs(tape.medianSettle),
      loading: swapsLoading,
      tooltip:
        tape.avgSettle == null ? undefined : `average ${secs(tape.avgSettle)}`,
    },
    {
      label: 'Active miners',
      value: totals ? count(totals.activeMiners) : '0',
      loading: totalsLoading,
    },
    {
      label: 'Nodes ever served',
      value: count(tape.nodesEver),
      loading: swapsLoading,
      tooltip: 'distinct hotkeys with at least one completed swap',
    },
    {
      label: 'In flight now',
      value: totals ? count(totals.activeSwaps) : '0',
      loading: totalsLoading,
    },
  ];

  const panels: {
    title: string;
    subtitle: string;
    info: string;
    body: React.ReactNode;
  }[] = [
    {
      title: 'Cumulative volume',
      subtitle: `all-time running total · ${money}`,
      info: 'Running total of completed swap volume since launch.',
      body: chart(series.cumulativeVolume, historyLoading, moneyTick),
    },
    {
      title: 'Cumulative transactions',
      subtitle: 'all-time running total',
      info: 'Running total of completed swaps since launch.',
      body: chart(series.cumulativeTransactions, historyLoading, compact, {
        integerY: true,
      }),
    },
    {
      title: 'Volume',
      subtitle: `per day · ${money}`,
      info: 'Completed swap volume each day, estimated in USD at current prices.',
      body: chart(series.volume, historyLoading, moneyTick),
    },
    {
      title: 'Transactions',
      subtitle: 'per day',
      info: 'Swaps completed each day.',
      body: chart(series.transactions, historyLoading, compact, {
        integerY: true,
      }),
    },
    {
      title: 'Cumulative fees',
      subtitle: `all-time running total · ${money}`,
      info: 'Running total of protocol fees since launch: 1% of cumulative volume.',
      body: chart(series.cumulativeFees, historyLoading, moneyTick),
    },
    {
      title: 'Protocol fees',
      subtitle: `per day · 1% of volume · ${money}`,
      info: 'Protocol fees each day: a flat 1% of that day’s volume, enforced by the contract.',
      body: chart(series.fees, historyLoading, moneyTick),
    },
    {
      title: 'Success rate',
      subtitle: '% of resolved swaps completed · days with none are gapped',
      info: 'Completed / (completed + timed out) among the swaps resolved each day.',
      body: chart(series.successRate, historyLoading, (v) => v.toFixed(0), {
        noArea: true,
      }),
    },
    {
      title: 'Settlement time',
      subtitle: 'median, average dashed · seconds, log scale',
      info: 'Time from initiation to completion. The median is what a typical swap waited; the average moves with one slow swap.',
      body: chart(series.settlement, historyLoading, secs, {
        logScale: true,
        noArea: true,
      }),
    },
    {
      title: 'Throughput',
      subtitle: 'average transactions per hour, per day',
      info: 'That day’s completed swaps spread over its 24 hours.',
      body: chart(series.throughput, historyLoading, (v) =>
        Number(v.toPrecision(2)).toString(),
      ),
    },
    {
      title: 'Serving nodes',
      subtitle: 'distinct nodes that completed a swap, per day',
      info: 'How many distinct nodes completed at least one swap each day.',
      body: chart(derived.servingNodes, swapsLoading, count, {
        integerY: true,
      }),
    },
    {
      title: 'Peak concurrent transactions',
      subtitle: 'most swaps in flight at once, per day',
      info: 'The most swaps open at one moment each day, from every swap’s initiation and resolution times.',
      body: chart(derived.peakInFlight, swapsLoading, count, {
        integerY: true,
      }),
    },
    {
      title: 'Volume by direction',
      subtitle: `share of completed volume in range · ${money}`,
      info: 'How volume in the selected range splits by direction (asset sent → asset received), priced at current rates.',
      body: (
        <DirectionMix
          rows={derived.mix}
          loading={swapsLoading}
          usdMode={usdMode}
        />
      ),
    },
  ];

  return (
    <Stack gap={3}>
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {tiles.map((t) => (
          <Grid item xs={6} sm={4} md={3} key={t.label}>
            <StatCell
              label={t.label}
              value={t.value}
              unit={t.unit}
              loading={t.loading}
              tooltip={t.tooltip}
            />
          </Grid>
        ))}
      </Grid>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          pt: 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.62rem',
            color: 'text.secondary',
          }}
        >
          tiles are all-time · charts follow the range · one column per UTC day,
          today still filling
        </Typography>
        <RangeChips value={range} options={RANGES} onChange={setRange} />
      </Box>
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {panels.map((p) => (
          <Grid item xs={12} md={6} key={p.title}>
            <Panel title={p.title} subtitle={p.subtitle} info={p.info}>
              {p.body}
            </Panel>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

/**
 * Label and share on one line, an 8px ink bar beneath: the same row the
 * Emission by pair panel draws, so the two breakdowns read alike.
 */
const DirectionMix: React.FC<{
  rows: { label: string; usd: number; pct: number }[];
  loading: boolean;
  usdMode: boolean;
}> = ({ rows, loading, usdMode }) => {
  if (loading) {
    return (
      <Stack gap={1.5} sx={{ mt: 1 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={28}
            sx={{ bgcolor: 'action.hover' }}
          />
        ))}
      </Stack>
    );
  }
  if (!usdMode || rows.length === 0) {
    return (
      <Typography
        align="center"
        sx={{ ...mono, fontSize: '0.7rem', color: 'text.secondary', py: 6 }}
      >
        {usdMode
          ? 'no completed transactions in this range'
          : 'prices unavailable, so directions cannot be compared'}
      </Typography>
    );
  }
  // Every direction the network has ever cleared is a long list; it scrolls
  // inside the panel so the row it shares with a chart keeps a chart's height.
  return (
    <Stack gap={1} sx={{ mt: 0.5, maxHeight: 300, overflowY: 'auto', pr: 1 }}>
      {rows.map((r) => (
        <Box key={r.label}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1,
              mb: 0.5,
            }}
          >
            <Typography noWrap sx={{ ...mono, color: 'text.primary' }}>
              {r.label}
            </Typography>
            <Typography
              sx={{ ...mono, whiteSpace: 'nowrap', color: 'text.secondary' }}
            >
              <Box
                component="span"
                sx={{ color: 'text.primary', fontWeight: 600 }}
              >
                {r.pct.toFixed(1)}%
              </Box>
              {'  ·  '}
              {formatUsd(r.usd)}
            </Typography>
          </Box>
          <Box
            sx={{ height: 8, width: '100%', backgroundColor: 'action.hover' }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${Math.min(100, r.pct)}%`,
                backgroundColor: 'text.primary',
              }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

export default StatsSection;
