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
  chainSymbol,
  formatUsd,
  lamportsToSol,
  unitsToHuman,
  usdFromBackingMap,
} from '../../utils/format';
import { FONTS } from '../../theme';
import { MOVE_COLORS } from '../dashboard/AllwaysMarketRate';

/**
 * Every figure about the network as a whole, most important first: the
 * all-time totals as a row of tiles, then the same things over time as
 * charts, in the same order. One lookback (`7d`, `30d`, `all`) drives every
 * chart and is kept in the URL as `statsRange` beside the tape's filters and
 * the miners' ranges, so a link restores the whole page. The tiles are
 * always all-time.
 *
 * Each chart takes the form its metric reads best in:
 * - running totals (volume, transactions, fees, users, nodes) are lines
 *   with an area, so growth is the shape;
 * - per-day quantities (volume, users, nodes, concurrency, peak hour) are
 *   bars, so a quiet day is an empty slot rather than a line bridging it;
 * - outcomes are one stacked column a day, completed beneath and timed out
 *   in red on top, so the failures are visible in proportion;
 * - the success rate is a trailing 7-day line, which smooths a lone timeout
 *   on a quiet day into the share it really is;
 * - waits are median bars in one axis unit, never a log scale;
 * - shares (direction, hub) are ranked bar lists.
 * Every panel carries its range figure top right.
 *
 * Sources: `/stats` for the totals (the one endpoint whose "all" really is
 * all-time; `/network/overview` caps at 30d), `/history` for the daily
 * money buckets, and the full tape for everything no aggregate carries.
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
const HOUR_MS = 3_600_000;
const dayOf = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS;
// The success-rate line looks back this many days from each day.
const TRAILING_DAYS = 7;

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

// Axis ticks in one unit for the whole axis: minutes once any bar reaches
// ten minutes, seconds otherwise. Whole numbers, so 0 is "0s" not "0.0s".
const tickSecs = (max: number) => (v: number) =>
  max >= 600 ? `${Math.round(v / 60)}m` : `${Math.round(v)}s`;

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

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const bump = <K,>(m: Map<K, number>, k: K, by = 1) =>
  m.set(k, (m.get(k) ?? 0) + by);

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
  let list = m.get(k);
  if (!list) m.set(k, (list = []));
  list.push(v);
};

const addTo = <K,>(m: Map<K, Set<string>>, k: K, v: string) => {
  let set = m.get(k);
  if (!set) m.set(k, (set = new Set()));
  set.add(v);
};

const distinct = (sets: Iterable<Set<string>>) =>
  new Set([...sets].flatMap((set) => [...set])).size;

const mono = {
  fontFamily: FONTS.mono,
  fontSize: '0.72rem',
  fontVariantNumeric: 'tabular-nums',
};

/** "SOL → BTC" from the swap's own legs. */
const directionLabel = (s: ActiveSwap) =>
  `${assetLabel(s.sourceChain ?? '')} → ${assetLabel(s.destChain ?? '')}`;

type ShareRow = { label: string; usd: number; pct: number; n: number };
type Tally = { usd: number; n: number };

const StatsSection: React.FC = () => {
  const theme = useTheme();
  const ink = theme.palette.text.primary;
  const inkSoft = theme.palette.text.secondary;
  // The one meaning red has on the site: a failed status.
  const red =
    MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'].down;
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
  // A completed swap's backing-leg notional, priced. Pre-v3 rows carry no
  // backing and were all SOL.
  const swapUsd = (s: ActiveSwap): number | null => {
    if (s.solAmount == null) return null;
    const backing = s.backing ?? 'sol';
    const price = prices[backing];
    return typeof price === 'number'
      ? unitsToHuman(s.solAmount, backing) * price
      : null;
  };

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
  const moneyTile = (usd: number | null, sol: number) => ({
    value: usd != null ? formatUsd(usd) : solAmount(sol),
    unit: usd != null ? undefined : 'SOL',
  });

  // Exact all-time reliability, speed, size and reach, from every swap.
  const tape = useMemo(() => {
    const swaps = allSwaps ?? [];
    let completed = 0;
    let timedOut = 0;
    const settle: number[] = [];
    const nodes = new Set<string>();
    const users = new Set<string>();
    let largest: number | null = null;
    let firstMs = Infinity;
    for (const s of swaps) {
      if (s.userAddress) users.add(s.userAddress);
      if (s.initiatedAt != null) {
        firstMs = Math.min(firstMs, Number(s.initiatedAt) * 1000);
      }
      if (s.status === 'COMPLETED') {
        completed += 1;
        if (s.minerHotkey) nodes.add(s.minerHotkey);
        if (s.initiatedAt != null && s.resolvedAt != null) {
          settle.push(Number(s.resolvedAt) - Number(s.initiatedAt));
        }
        const usd = swapUsd(s);
        if (usd != null && (largest == null || usd > largest)) largest = usd;
      } else if (s.status === 'TIMED_OUT') {
        timedOut += 1;
      }
    }
    const resolved = completed + timedOut;
    return {
      successRate: resolved ? (completed / resolved) * 100 : null,
      medianSettle: median(settle),
      avgSettle: settle.length ? sum(settle) / settle.length : null,
      nodesEver: nodes.size,
      usersEver: users.size,
      largest,
      daysLive: Number.isFinite(firstMs)
        ? Math.floor((Date.now() - firstMs) / DAY_MS) + 1
        : null,
    };
    // swapUsd closes over prices, the real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSwaps, prices]);

  // --- History charts (money by day) ----------------------------------------
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

  const series = useMemo(() => {
    const line = (
      name: string,
      pick: (r: HistoryRow) => number | null,
      extra: Partial<ChartSeries> = {},
    ): ChartSeries[] => [
      { name, color: ink, points: points(history, pick), ...extra },
    ];
    const rows = history ?? [];
    const rangeVolume = sum(rows.map((r) => volume(r) ?? 0));
    const rangeSwaps = sum(rows.map((r) => r.swaps));
    return {
      cumulativeVolume: line('Cumulative volume', cumulativeVolume, {
        formatValue: moneyValue,
      }),
      cumulativeTransactions: line(
        'Cumulative transactions',
        (r) => r.cumulativeSwaps,
        { formatValue: count },
      ),
      volume: line('Volume', volume, { type: 'bar', formatValue: moneyValue }),
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
      // Mean size of that day's completed swaps; no bar on an empty day.
      avgSize: line(
        'Average transaction',
        (r) => {
          const v = volume(r);
          return v == null || !r.swaps ? null : v / r.swaps;
        },
        { type: 'bar', formatValue: moneyValue },
      ),
      rangeVolume,
      rangeSwaps,
      rangeAvgSize: rangeSwaps ? rangeVolume / rangeSwaps : null,
    };
    // The pickers close over usdMode and prices, which are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, ink, usdMode, prices]);

  // --- Tape charts (everything no aggregate carries) ------------------------
  const derived = useMemo(() => {
    const swaps = (allSwaps ?? []).filter((s) => s.initiatedAt != null);
    const nowMs = Date.now();
    const days = RANGE_DAYS[range];
    const sinceMs = days == null ? 0 : dayOf(nowMs) - (days - 1) * DAY_MS;
    // The trailing success-rate window reaches back before the range.
    const outcomesSinceMs = Math.max(0, sinceMs - TRAILING_DAYS * DAY_MS);

    // Keyed by the day the swap resolved: that is when the network knew, and
    // when a timeout became a timeout.
    const completedByDay = new Map<number, number>();
    const timedOutByDay = new Map<number, number>();
    const settleByDay = new Map<number, number[]>();
    const fillByDay = new Map<number, number[]>();
    const completedByHour = new Map<number, number>();
    // Keyed by the day the swap was initiated: who showed up.
    const usersByDay = new Map<number, Set<string>>();
    const servingByDay = new Map<number, Set<string>>();
    // First day each user and node appeared, for the running totals.
    const userFirstDay = new Map<string, number>();
    const nodeFirstDay = new Map<string, number>();
    // +1 at initiation, -1 at resolution (open swaps run to now); a sweep in
    // time order tracks exact concurrency. Day boundaries get zero-delta
    // checkpoints so a swap spanning a quiet day still registers there.
    const sweep: [number, number][] = [];
    const byDirection = new Map<string, Tally>();
    const byHub = new Map<string, Tally>();
    // Priced volume per hub per initiated day, for the stacked hub columns.
    const hubByDay = new Map<string, Map<number, number>>();
    const tally = (m: Map<string, Tally>, key: string, usd: number) => {
      const t = m.get(key) ?? { usd: 0, n: 0 };
      t.usd += usd;
      t.n += 1;
      m.set(key, t);
    };
    const rangeSettle: number[] = [];
    const rangeFill: number[] = [];
    let firstMs = Infinity;

    for (const s of swaps) {
      const start = Number(s.initiatedAt) * 1000;
      const end = s.resolvedAt == null ? nowMs : Number(s.resolvedAt) * 1000;
      firstMs = Math.min(firstMs, start);
      sweep.push([start, 1], [end, -1]);
      const startDay = dayOf(start);
      const endDay = dayOf(end);
      if (s.userAddress) {
        const seen = userFirstDay.get(s.userAddress);
        if (seen == null || startDay < seen)
          userFirstDay.set(s.userAddress, startDay);
      }
      if (s.status === 'COMPLETED' && s.minerHotkey) {
        const seen = nodeFirstDay.get(s.minerHotkey);
        if (seen == null || startDay < seen)
          nodeFirstDay.set(s.minerHotkey, startDay);
      }

      if (endDay >= outcomesSinceMs) {
        if (s.status === 'COMPLETED') bump(completedByDay, endDay);
        else if (s.status === 'TIMED_OUT') bump(timedOutByDay, endDay);
      }
      if (endDay >= sinceMs && s.status === 'COMPLETED') {
        bump(completedByHour, Math.floor(end / HOUR_MS) * HOUR_MS);
        if (s.resolvedAt != null) {
          const took = (end - start) / 1000;
          push(settleByDay, endDay, took);
          rangeSettle.push(took);
        }
        if (s.fulfilledAt != null) {
          const fill = Number(s.fulfilledAt) - Number(s.initiatedAt);
          if (fill >= 0) {
            push(fillByDay, endDay, fill);
            rangeFill.push(fill);
          }
        }
      }

      if (startDay < sinceMs) continue;
      if (s.userAddress) addTo(usersByDay, startDay, s.userAddress);
      if (s.status !== 'COMPLETED') continue;
      if (s.minerHotkey) addTo(servingByDay, startDay, s.minerHotkey);
      const usd = usdMode ? swapUsd(s) : null;
      if (usd != null) {
        tally(byDirection, directionLabel(s), usd);
        const hub = s.backing ?? 'sol';
        tally(byHub, hub, usd);
        let perDay = hubByDay.get(hub);
        if (!perDay) hubByDay.set(hub, (perDay = new Map()));
        bump(perDay, startDay, usd);
      }
    }

    const empty = {
      outcomes: [] as ChartSeries[],
      successRate: [] as ChartSeries[],
      settlement: [] as ChartSeries[],
      users: [] as ChartSeries[],
      cumulativeUsers: [] as ChartSeries[],
      peakHour: [] as ChartSeries[],
      servingNodes: [] as ChartSeries[],
      cumulativeNodes: [] as ChartSeries[],
      peakInFlight: [] as ChartSeries[],
      directions: [] as ShareRow[],
      hubs: [] as ShareRow[],
      hubVolume: [] as ChartSeries[],
      rangeCompleted: 0,
      rangeTimedOut: 0,
      rangeSuccessRate: null as number | null,
      rangeMedianSettle: null as number | null,
      rangeMedianFill: null as number | null,
      rangeUsers: 0,
      rangePeakHour: 0,
      rangePeakInFlight: 0,
      rangeServingNodes: 0,
      settleMax: 0,
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

    // Busiest hour of each day.
    const peakHourByDay = new Map<number, number>();
    for (const [hour, n] of completedByHour) {
      const day = dayOf(hour);
      peakHourByDay.set(day, Math.max(peakHourByDay.get(day) ?? 0, n));
    }

    // Trailing success rate: completed over resolved in the 7 days ending on
    // each day; blank while nothing resolved in that window.
    const trailing = (t: number) => {
      let c = 0;
      let x = 0;
      for (let d = t - (TRAILING_DAYS - 1) * DAY_MS; d <= t; d += DAY_MS) {
        c += completedByDay.get(d) ?? 0;
        x += timedOutByDay.get(d) ?? 0;
      }
      return c + x ? (c / (c + x)) * 100 : null;
    };

    // Running count of distinct ids over the day list, seeded with those
    // first seen before the range so the line is the true all-time total.
    const runningCount = (firstDays: Map<string, number>): SeriesPoint[] => {
      const perDay = new Map<number, number>();
      for (const d of firstDays.values()) bump(perDay, d);
      let running = 0;
      for (const [d, n] of perDay) if (d < firstDay) running += n;
      return dayList.map((t) => {
        running += perDay.get(t) ?? 0;
        return { t, value: running };
      });
    };

    const shares = (m: Map<string, Tally>): ShareRow[] => {
      const total = sum([...m.values()].map((v) => v.usd));
      return [...m.entries()]
        .map(([label, v]) => ({
          label,
          usd: v.usd,
          n: v.n,
          pct: total ? (v.usd / total) * 100 : 0,
        }))
        .sort((a, b) => b.usd - a.usd);
    };

    const daily = (pick: (t: number) => number | null): SeriesPoint[] =>
      dayList.map((t) => ({ t, value: pick(t) }));
    const bar = (
      name: string,
      color: string,
      pick: (t: number) => number | null,
      extra: Partial<ChartSeries> = {},
    ): ChartSeries => ({
      name,
      color,
      type: 'bar',
      formatValue: count,
      points: daily(pick),
      ...extra,
    });
    const growth = (name: string, firstDays: Map<string, number>) =>
      [
        {
          name,
          color: ink,
          formatValue: count,
          points: runningCount(firstDays),
        },
      ] as ChartSeries[];

    const rangeCompleted = sum(dayList.map((t) => completedByDay.get(t) ?? 0));
    const rangeTimedOut = sum(dayList.map((t) => timedOutByDay.get(t) ?? 0));
    const rangeResolved = rangeCompleted + rangeTimedOut;
    const dayMedians = [...settleByDay.values()].map((xs) => median(xs) ?? 0);
    const fillMedians = [...fillByDay.values()].map((xs) => median(xs) ?? 0);

    return {
      outcomes: [
        bar('Completed', ink, (t) => completedByDay.get(t) ?? null, {
          stack: 'outcomes',
        }),
        bar('Timed out', red, (t) => timedOutByDay.get(t) ?? null, {
          stack: 'outcomes',
        }),
      ],
      successRate: [
        {
          name: `${TRAILING_DAYS}-day success rate`,
          color: ink,
          formatValue: (v: number) => `${v.toFixed(1)}%`,
          points: daily(trailing),
        },
      ] as ChartSeries[],
      settlement: [
        bar('Fill', inkSoft, (t) => median(fillByDay.get(t) ?? []), {
          formatValue: secs,
        }),
        bar('Settled', ink, (t) => median(settleByDay.get(t) ?? []), {
          formatValue: secs,
        }),
      ],
      users: [bar('Users', ink, (t) => usersByDay.get(t)?.size ?? null)],
      cumulativeUsers: growth('Users ever', userFirstDay),
      peakHour: [bar('Busiest hour', ink, (t) => peakHourByDay.get(t) ?? null)],
      servingNodes: [
        bar('Serving nodes', ink, (t) => servingByDay.get(t)?.size ?? null),
      ],
      cumulativeNodes: growth('Nodes ever', nodeFirstDay),
      peakInFlight: [
        bar('Peak concurrent', ink, (t) => peakByDay.get(t) ?? null),
      ],
      directions: shares(byDirection),
      hubs: shares(byHub).map((h) => ({
        ...h,
        label: `${chainSymbol(h.label)} hub`,
      })),
      // One stacked column a day, the biggest hub in ink at the bottom.
      hubVolume: shares(byHub).map((h, i) =>
        bar(
          `${chainSymbol(h.label)} hub`,
          [ink, inkSoft, theme.palette.text.disabled][i % 3],
          (t) => hubByDay.get(h.label)?.get(t) ?? null,
          { stack: 'hub', formatValue: moneyValue },
        ),
      ),
      rangeCompleted,
      rangeTimedOut,
      rangeSuccessRate: rangeResolved
        ? (rangeCompleted / rangeResolved) * 100
        : null,
      rangeMedianSettle: median(rangeSettle),
      rangeMedianFill: median(rangeFill),
      rangeUsers: distinct(usersByDay.values()),
      rangePeakHour: Math.max(0, ...peakHourByDay.values()),
      rangePeakInFlight: Math.max(
        0,
        ...dayList.map((t) => peakByDay.get(t) ?? 0),
      ),
      rangeServingNodes: distinct(servingByDay.values()),
      settleMax: Math.max(0, ...dayMedians, ...fillMedians),
    };
    // swapUsd and moneyValue close over prices and usdMode, both listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSwaps, range, ink, inkSoft, red, usdMode, prices]);

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
      emptyLabel="nothing in this range"
      {...extra}
    />
  );

  // A panel's one summary figure, top right in the header.
  const readout = (text: string | null) =>
    text == null ? undefined : (
      <Typography
        sx={{
          ...mono,
          fontSize: '0.82rem',
          fontWeight: 700,
          color: 'text.primary',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </Typography>
    );
  const inRange = (text: string) => `${text} in range`;

  const tiles: {
    label: string;
    value: string;
    unit?: string;
    loading: boolean;
    tooltip?: string;
  }[] = [
    {
      label: 'Total volume',
      ...moneyTile(totalVolumeUsd, totalVolumeSol),
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
      ...moneyTile(
        totalVolumeUsd == null ? null : totalVolumeUsd * 0.01,
        totalVolumeSol * 0.01,
      ),
      loading: totalsLoading,
      tooltip: '1% of total volume',
    },
    {
      label: 'Unique users',
      value: count(tape.usersEver),
      loading: swapsLoading,
      tooltip: 'distinct user addresses that initiated a swap',
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
      label: 'Average transaction',
      ...moneyTile(
        totalVolumeUsd != null && totals?.totalSwaps
          ? totalVolumeUsd / totals.totalSwaps
          : null,
        totals?.totalSwaps ? totalVolumeSol / totals.totalSwaps : 0,
      ),
      loading: totalsLoading,
      tooltip: 'total volume / total transactions',
    },
    {
      label: 'Largest transaction',
      value: tape.largest == null ? '—' : formatUsd(tape.largest),
      loading: swapsLoading,
      tooltip:
        'biggest completed swap by backing-leg notional, at current prices',
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
    {
      label: 'Days live',
      value: tape.daysLive == null ? '—' : count(tape.daysLive),
      loading: swapsLoading,
      tooltip: 'since the first swap was initiated',
    },
  ];

  const panels: {
    title: string;
    subtitle: string;
    info: string;
    body: React.ReactNode;
    headerRight?: React.ReactNode;
  }[] = [
    {
      title: 'Cumulative volume',
      subtitle: `all-time running total · ${money}`,
      info: 'Running total of completed swap volume since launch.',
      body: chart(series.cumulativeVolume, historyLoading, moneyTick),
      headerRight: readout(inRange(moneyValue(series.rangeVolume))),
    },
    {
      title: 'Cumulative transactions',
      subtitle: 'all-time running total',
      info: 'Running total of completed swaps since launch.',
      body: chart(series.cumulativeTransactions, historyLoading, compact, {
        integerY: true,
      }),
      headerRight: readout(inRange(count(series.rangeSwaps))),
    },
    {
      title: 'Volume',
      subtitle: `per day · ${money}`,
      info: 'Completed swap volume each day, estimated in USD at current prices.',
      body: chart(series.volume, historyLoading, moneyTick),
      headerRight: readout(inRange(moneyValue(series.rangeVolume))),
    },
    {
      title: 'Transactions',
      subtitle: 'per day · completed, with timed out stacked in red',
      info: 'One column a day: swaps that completed, with the ones that timed out stacked on top in red, by the day they resolved.',
      body: chart(derived.outcomes, swapsLoading, compact, { integerY: true }),
      headerRight: readout(
        `${count(derived.rangeCompleted)} completed · ${count(derived.rangeTimedOut)} timed out`,
      ),
    },
    {
      title: 'Success rate',
      subtitle: `trailing ${TRAILING_DAYS}-day share of resolved swaps that completed`,
      info: `For each day, completed / (completed + timed out) over the ${TRAILING_DAYS} days ending that day, so one timeout on a quiet day reads as the share it is. Blank while nothing resolved in the window. The figure at right is the same share over the whole range.`,
      body: chart(
        derived.successRate,
        swapsLoading,
        (v) => `${v.toFixed(0)}%`,
        { noArea: true },
      ),
      headerRight: readout(
        derived.rangeSuccessRate == null
          ? null
          : inRange(`${derived.rangeSuccessRate.toFixed(1)}%`),
      ),
    },
    {
      title: 'Protocol fees',
      subtitle: `all-time running total · 1% of volume · ${money}`,
      info: 'Running total of protocol fees since launch: a flat 1% of volume, enforced by the contract. Fees per day follow the Volume chart at one hundredth.',
      body: chart(series.cumulativeFees, historyLoading, moneyTick),
      headerRight: readout(inRange(moneyValue(series.rangeVolume * 0.01))),
    },
    {
      title: 'Average transaction',
      subtitle: `per day · ${money}`,
      info: 'That day’s completed volume divided by its completed swaps.',
      body: chart(series.avgSize, historyLoading, moneyTick),
      headerRight: readout(
        series.rangeAvgSize == null
          ? null
          : inRange(moneyValue(series.rangeAvgSize)),
      ),
    },
    {
      title: 'Users',
      subtitle: 'distinct user addresses that swapped, per day',
      info: 'How many distinct user addresses initiated at least one swap each day.',
      body: chart(derived.users, swapsLoading, count, { integerY: true }),
      headerRight: readout(inRange(count(derived.rangeUsers))),
    },
    {
      title: 'Unique users',
      subtitle: 'all-time running total of distinct users',
      info: 'Running count of distinct user addresses since launch, by the day each first swapped.',
      body: chart(derived.cumulativeUsers, swapsLoading, count, {
        integerY: true,
      }),
      headerRight: readout(`${count(tape.usersEver)} all-time`),
    },
    {
      title: 'Settlement time',
      subtitle: 'median wait per day · fill (miner sent) and settled (done)',
      info: 'For that day’s completed swaps: the median time from initiation to the miner’s fill, and to final settlement. Half were faster, half slower. The figure at right is over the whole range.',
      body: chart(
        derived.settlement,
        swapsLoading,
        tickSecs(derived.settleMax),
        { integerY: true },
      ),
      headerRight: readout(
        derived.rangeMedianSettle == null
          ? null
          : inRange(
              derived.rangeMedianFill == null
                ? secs(derived.rangeMedianSettle)
                : `${secs(derived.rangeMedianFill)} fill · ${secs(derived.rangeMedianSettle)} settled`,
            ),
      ),
    },
    {
      title: 'Peak throughput',
      subtitle: 'most swaps completed in any one hour, per day',
      info: 'The busiest hour of each day: how many swaps completed within it. What the network has actually handled at once.',
      body: chart(derived.peakHour, swapsLoading, count, { integerY: true }),
      headerRight: readout(inRange(`${count(derived.rangePeakHour)} / hour`)),
    },
    {
      title: 'Peak concurrent transactions',
      subtitle: 'most swaps in flight at once, per day',
      info: 'The most swaps open at one moment each day, from every swap’s initiation and resolution times.',
      body: chart(derived.peakInFlight, swapsLoading, count, {
        integerY: true,
      }),
      headerRight: readout(inRange(count(derived.rangePeakInFlight))),
    },
    {
      title: 'Serving nodes',
      subtitle: 'distinct nodes that completed a swap, per day',
      info: 'How many distinct nodes completed at least one swap each day.',
      body: chart(derived.servingNodes, swapsLoading, count, {
        integerY: true,
      }),
      headerRight: readout(inRange(count(derived.rangeServingNodes))),
    },
    {
      title: 'Nodes ever served',
      subtitle: 'all-time running total of distinct nodes',
      info: 'Running count of distinct hotkeys since launch, by the day each first completed a swap.',
      body: chart(derived.cumulativeNodes, swapsLoading, count, {
        integerY: true,
      }),
      headerRight: readout(`${count(tape.nodesEver)} all-time`),
    },
    {
      title: 'Volume by direction',
      subtitle: `share of completed volume in range · ${money}`,
      info: 'How volume in the selected range splits by direction (asset sent → asset received), priced at current rates, with the number of swaps.',
      body: (
        <ShareList
          rows={derived.directions}
          loading={swapsLoading}
          usdMode={usdMode}
        />
      ),
      headerRight: readout(
        inRange(`${count(derived.directions.length)} directions`),
      ),
    },
    {
      title: 'Volume by hub',
      subtitle: `per day, stacked by backing chain · ${money}`,
      info: 'Completed volume each day split by the hub whose collateral backed the swap: SOL backing and TAO backing stacked in one column. The figure at right is each hub’s share of the range.',
      body: chart(derived.hubVolume, swapsLoading, moneyTick),
      headerRight: readout(
        derived.hubs.length
          ? inRange(
              derived.hubs
                .map((h) => `${h.pct.toFixed(0)}% ${h.label}`)
                .join(' · '),
            )
          : null,
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
            <Panel
              title={p.title}
              subtitle={p.subtitle}
              info={p.info}
              headerRight={p.headerRight}
            >
              {p.body}
            </Panel>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

/**
 * Ranked shares: label, share, amount and count on one line, an 8px ink bar
 * beneath: the same row the Emission by pair panel draws, so the breakdowns
 * read alike. Long lists scroll inside the panel so the row they share with
 * a chart keeps a chart's height.
 */
const ShareList: React.FC<{
  rows: ShareRow[];
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
          ? 'nothing in this range'
          : 'prices unavailable, so shares cannot be compared'}
      </Typography>
    );
  }
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
              {'  ·  '}
              {r.n} {r.n === 1 ? 'swap' : 'swaps'}
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
