import React, { useMemo } from 'react';
import DailyEconomics from './DailyEconomics';
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
  PanelReadout,
} from '../stats';
import RangeChips from '../RangeChips';
import {
  useCompleteSwapHistory,
  useHistory,
  useDailyTreasury,
  useStats,
  useUsdPrices,
  type HistoryRange,
} from '../../api';
import type { ActiveSwap, HistoryRow } from '../../api/models';
import { assetLabel, hubChains } from '../../api/models/chains';
import {
  formatCompact,
  formatCount,
  formatUsdCompact,
  asNumber,
  chainSymbol,
  formatUsd,
  lamportsToSol,
  unitsToHuman,
  usdFromBackingMap,
} from '../../utils/format';
import {
  UTC_DAY_MS,
  dailyEconomics,
  economicsThroughNow,
  summarizeEconomics,
} from '../../utils/dailyEconomics';
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

const compact = formatCompact;
const usdCompact = formatUsdCompact;
const count = formatCount;

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

// The leaders and one "Other" row for the long tail, so a list of 50-odd
// directions reads as a ranking rather than a ledger.
const topWithOther = (rows: ShareRow[], keep: number): ShareRow[] => {
  if (rows.length <= keep + 1) return rows;
  const rest = rows.slice(keep);
  return [
    ...rows.slice(0, keep),
    {
      label: `Other · ${rest.length} directions`,
      usd: rest.reduce((a, r) => a + r.usd, 0),
      pct: rest.reduce((a, r) => a + r.pct, 0),
      n: rest.reduce((a, r) => a + r.n, 0),
    },
  ];
};
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
  const {
    data: history,
    isLoading: historyLoading,
    isPlaceholderData: historyPlaceholder,
  } = useHistory(range as HistoryRange, 'day');
  const { data: totals, isLoading: totalsLoading } = useStats();
  const { data: allSwaps, isLoading: swapsLoading } = useCompleteSwapHistory();

  const prices = useUsdPrices();
  // Volume and fees render as estimated USD (the one legitimate sum across
  // backings) whenever every hub has a price; otherwise the SOL-only figure,
  // which leaves TAO-backed flow out and says so in the subtitle.
  // Point-in-time pricing: a das with usd_price_history values every swap
  // at its backing's price in the hour it resolved and says so in the
  // fields below. Against an older das, fall back to today's prices and
  // label the figures as estimates.
  const pointInTime =
    asNumber(totals?.totalVolumeUsd) !== undefined &&
    (history ?? []).every((r) => asNumber(r.volumeUsd) !== undefined);
  const usdMode =
    pointInTime || hubChains().every((h) => typeof prices[h] === 'number');
  const money = pointInTime
    ? 'USD at time of swap'
    : usdMode
      ? 'estimated USD at today’s prices'
      : 'SOL only';
  const moneyTick = usdMode ? usdCompact : compact;
  const moneyValue = usdMode ? formatUsd : solAmount;
  // A completed swap's backing-leg notional in USD: at the hour it resolved
  // when das priced it, else at today's price. Pre-v3 rows carry no backing
  // and were all SOL.
  const swapUsd = (s: ActiveSwap): number | null => {
    if (s.usdValue !== undefined) return asNumber(s.usdValue) ?? null;
    if (s.solAmount == null) return null;
    const backing = s.backing ?? 'sol';
    const price = prices[backing];
    return typeof price === 'number'
      ? unitsToHuman(s.solAmount, backing) * price
      : null;
  };

  // Daily reservation and churn income over the selected range (all-time
  // starts at the first history day), shared with the fees vs emissions panel.
  const todayStart = Math.floor(Date.now() / UTC_DAY_MS) * UTC_DAY_MS;
  const firstDay = history?.length ? ms(history[0].t) : null;
  const feeDays =
    range === '7d'
      ? 7
      : range === '30d' || firstDay == null
        ? 30
        : Math.max(1, Math.round((todayStart - firstDay) / UTC_DAY_MS));
  // Every range compares with the period just before it, so treasury income
  // loads for twice the window (cached per day; ALL has nothing before it).
  const dailyIncome = useDailyTreasury(
    range === 'all' ? feeDays : feeDays * 2,
    todayStart,
  );
  const { data: allHistory } = useHistory('all' as HistoryRange, 'day');
  const feeRows = useMemo(
    () =>
      economicsThroughNow(
        history ?? [],
        [],
        feeDays,
        Date.now(),
        dailyIncome.treasury,
        dailyIncome.solUsd ?? [],
      ),
    [history, feeDays, dailyIncome.treasury, dailyIncome.solUsd],
  );
  const feeTotals = summarizeEconomics(feeRows);

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
      timedOut,
      medianSettle: median(settle),
      avgSettle: settle.length ? sum(settle) / settle.length : null,
      nodesEver: nodes.size,
      usersEver: users.size,
      largest,
      daysLive: Number.isFinite(firstMs)
        ? Math.floor((Date.now() - firstMs) / DAY_MS) + 1
        : null,
    };
    // swapUsd closes over prices and the point-in-time flag, the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSwaps, prices, pointInTime]);

  // --- History charts (money by day) ----------------------------------------
  const volume = (r: HistoryRow) =>
    pointInTime
      ? (asNumber(r.volumeUsd) ?? null)
      : usdMode
        ? usdFromBackingMap(r.volumeByBacking, prices, r.volumeSol)
        : lamportsToSol(r.volumeSol);
  const cumulativeVolume = (r: HistoryRow) =>
    pointInTime
      ? (asNumber(r.cumulativeVolumeUsd) ?? null)
      : usdMode
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
    // The pickers close over pointInTime, usdMode and prices, the real
    // inputs; the flag flips once /stats lands, so it must be listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, ink, pointInTime, usdMode, prices]);

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
    let rangeLargest: number | null = null;
    const priorUsers = new Set<string>();
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

      if (
        days != null &&
        s.userAddress &&
        startDay < sinceMs &&
        startDay >= sinceMs - days * DAY_MS
      )
        priorUsers.add(s.userAddress);
      if (startDay < sinceMs) continue;
      if (s.userAddress) addTo(usersByDay, startDay, s.userAddress);
      if (s.status !== 'COMPLETED') continue;
      if (s.minerHotkey) addTo(servingByDay, startDay, s.minerHotkey);
      const notional = swapUsd(s);
      if (notional != null && (rangeLargest == null || notional > rangeLargest))
        rangeLargest = notional;
      const usd = usdMode ? notional : null;
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
      rangeDirections: 0,
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
      rangeLargest: null as number | null,
      rangeNewUsers: 0,
      priorUsers: null as number | null,
      rangeActiveDays: 0,
      rangeDays: 0,
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
      directions: topWithOther(shares(byDirection), 10),
      rangeDirections: byDirection.size,
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
      rangeLargest,
      rangeNewUsers: [...userFirstDay.values()].filter((d) => d >= sinceMs)
        .length,
      priorUsers: days == null ? null : priorUsers.size,
      rangeActiveDays: dayList.filter((t) => (completedByDay.get(t) ?? 0) > 0)
        .length,
      rangeDays: dayList.length,
      settleMax: Math.max(0, ...dayMedians, ...fillMedians),
    };
    // swapUsd and moneyValue close over prices, usdMode and pointInTime,
    // all listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSwaps, range, ink, inkSoft, red, usdMode, prices, pointInTime]);

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
    text == null ? undefined : <PanelReadout>{text}</PanelReadout>;
  const inRange = (text: string) => `${text} in range`;

  // Every figure covers the selected range, like the charts beneath it;
  // only the live counts (in flight, active miners) describe right now.
  const usdTile = (v: number | null) => (v == null ? '—' : formatUsd(v));

  // --- Change vs the previous period ---------------------------------------
  // Complete UTC days only, so today's partial day never makes a period look
  // weaker than the one before. ALL has nothing before it: "since launch".
  const compare = range !== 'all';
  const windowStart = todayStart - feeDays * UTC_DAY_MS;
  const priorStart = windowStart - feeDays * UTC_DAY_MS;
  const histSum = (
    from: number,
    to: number,
    pick: (r: HistoryRow) => number | null,
  ) =>
    (allHistory ?? [])
      .filter((r) => ms(r.t) >= from && ms(r.t) < to)
      .reduce((a, r) => a + (pick(r) ?? 0), 0);
  const change = (cur: number | null, prev: number | null) =>
    cur == null || prev == null || prev <= 0 ? null : (cur / prev - 1) * 100;
  const deltaCaption = compare
    ? `vs prior ${range.toUpperCase()}`
    : 'since launch';
  const delta = (pct: number | null) => ({
    pct: compare ? pct : null,
    caption: deltaCaption,
  });
  const completeFees = (now: number) =>
    summarizeEconomics(
      dailyEconomics(
        allHistory ?? [],
        [],
        feeDays,
        now,
        dailyIncome.treasury,
        dailyIncome.solUsd ?? [],
      ),
    ).fees;
  const feesNow = completeFees(todayStart);
  const feesPrior = compare ? completeFees(windowStart) : null;
  // Annualized at this range's daily pace (complete days), the run-rate
  // convention protocol dashboards use, always labelled with its basis.
  const annualizedFees = feesNow == null ? null : (feesNow / feeDays) * 365;
  const volumeChange = change(
    histSum(windowStart, todayStart, volume),
    histSum(priorStart, windowStart, volume),
  );
  const tiles: {
    label: string;
    value: string;
    unit?: string;
    loading: boolean;
    tooltip?: string;
    delta?: { pct: number | null; caption: string };
  }[] = [
    // Overview: the four numbers the page leads with.
    {
      label: 'Total volume',
      value: moneyValue(series.rangeVolume),
      unit: usdMode ? undefined : 'SOL',
      loading: historyLoading,
      tooltip: `completed swap volume in range · ${money}`,
      delta: delta(volumeChange),
    },
    {
      label: 'Protocol fees',
      value: usdTile(feeTotals.fees),
      loading: historyLoading || dailyIncome.isLoading,
      tooltip:
        'transaction + reservation + quote churn fees, all spent on buybacks',
      delta: delta(change(feesNow, feesPrior)),
    },
    {
      label: 'Annualized fees',
      value: usdTile(annualizedFees),
      loading: historyLoading || dailyIncome.isLoading,
      tooltip: 'protocol fees per complete day in range × 365',
      delta: {
        pct: null,
        caption: compare
          ? `at the ${range.toUpperCase()} daily average`
          : 'at the all-time daily average',
      },
    },
    {
      label: 'Total users',
      value: count(derived.rangeUsers),
      loading: swapsLoading,
      tooltip: 'distinct addresses that started a swap in range',
      delta: delta(change(derived.rangeUsers, derived.priorUsers)),
    },
    {
      label: 'Volume',
      value: moneyValue(series.rangeVolume),
      unit: usdMode ? undefined : 'SOL',
      loading: historyLoading,
      tooltip: `completed swap volume in range · ${money}`,
    },
    {
      label: 'Transactions',
      value: count(series.rangeSwaps),
      loading: historyLoading,
      tooltip: 'completed swaps in range',
    },
    {
      label: 'Average transaction',
      value:
        series.rangeAvgSize == null ? '—' : moneyValue(series.rangeAvgSize),
      unit: usdMode || series.rangeAvgSize == null ? undefined : 'SOL',
      loading: historyLoading,
      tooltip: 'volume / transactions, in range',
    },
    {
      label: 'Largest transaction',
      value: usdTile(derived.rangeLargest),
      loading: swapsLoading,
      tooltip: pointInTime
        ? 'biggest completed swap in range, at the price of its hour'
        : 'biggest completed swap in range, at today’s prices',
    },
    {
      label: 'Success rate',
      value:
        derived.rangeSuccessRate == null
          ? '—'
          : derived.rangeSuccessRate.toFixed(1),
      unit: derived.rangeSuccessRate == null ? undefined : '%',
      loading: swapsLoading,
      tooltip: 'completed / (completed + timed out), resolved in range',
    },
    {
      label: 'Median settlement',
      value:
        derived.rangeMedianSettle == null
          ? '—'
          : secs(derived.rangeMedianSettle),
      loading: swapsLoading,
      tooltip:
        derived.rangeMedianFill == null
          ? 'initiation to settlement, in range'
          : `median fill ${secs(derived.rangeMedianFill)}, in range`,
    },
    {
      label: 'Timed out',
      value: count(derived.rangeTimedOut),
      loading: swapsLoading,
      tooltip: 'swaps that expired before settling, in range',
    },
    {
      label: 'In flight now',
      value: totals ? count(totals.activeSwaps) : '0',
      loading: totalsLoading,
      tooltip: 'live: swaps open right now',
    },
    {
      label: 'New users',
      value: count(derived.rangeNewUsers),
      loading: swapsLoading,
      tooltip: 'addresses whose first ever swap was in range',
    },
    {
      label: 'Returning users',
      value: count(Math.max(0, derived.rangeUsers - derived.rangeNewUsers)),
      loading: swapsLoading,
      tooltip:
        'addresses that had swapped before the range and swapped again in it',
    },
    {
      label: 'Active miners',
      value: totals ? count(totals.activeMiners) : '0',
      loading: totalsLoading,
      tooltip: 'live: miners active right now',
    },
    {
      label: 'Nodes served',
      value: count(derived.rangeServingNodes),
      loading: swapsLoading,
      tooltip: 'distinct hotkeys that completed a swap in range',
    },
    {
      label: 'Active days',
      value: derived.rangeDays
        ? `${derived.rangeActiveDays} of ${derived.rangeDays}`
        : '—',
      loading: swapsLoading,
      tooltip: 'days in range with at least one completed swap',
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
      subtitle: `running total · completed volume · ${money}`,
      info: 'Running total of completed swap volume since launch.',
      body: chart(series.cumulativeVolume, historyLoading, moneyTick),
      headerRight: readout(inRange(moneyValue(series.rangeVolume))),
    },
    {
      title: 'Cumulative transactions',
      subtitle: 'running total · completed swaps',
      info: 'Running total of completed swaps since launch.',
      body: chart(series.cumulativeTransactions, historyLoading, compact, {
        integerY: true,
      }),
      headerRight: readout(inRange(count(series.rangeSwaps))),
    },
    {
      title: 'Volume',
      subtitle: `per day · completed volume · ${money}`,
      info: 'Completed swap volume each day, estimated in USD at current prices.',
      body: chart(series.volume, historyLoading, moneyTick),
      headerRight: readout(inRange(moneyValue(series.rangeVolume))),
    },
    {
      title: 'Transactions',
      subtitle: 'per day · completed, timed out in red',
      info: 'One column a day: swaps that completed, with the ones that timed out stacked on top in red, by the day they resolved.',
      body: chart(derived.outcomes, swapsLoading, compact, { integerY: true }),
      headerRight: readout(
        `${count(series.rangeSwaps)} completed · ${count(derived.rangeTimedOut)} timed out`,
      ),
    },
    {
      title: 'Success rate',
      subtitle: `per day · completed share, trailing ${TRAILING_DAYS} days`,
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
      title: 'Average transaction',
      subtitle: `per day · volume / swaps · ${money}`,
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
      subtitle: 'per day · distinct addresses that swapped',
      info: 'How many distinct user addresses initiated at least one swap each day.',
      body: chart(derived.users, swapsLoading, count, { integerY: true }),
      headerRight: readout(inRange(count(derived.rangeUsers))),
    },
    {
      title: 'Unique users',
      subtitle: 'running total · distinct addresses',
      info: 'Running count of distinct user addresses since launch, by the day each first swapped.',
      body: chart(derived.cumulativeUsers, swapsLoading, count, {
        integerY: true,
      }),
      headerRight: readout(`${count(tape.usersEver)} all-time`),
    },
    {
      title: 'Settlement time',
      subtitle: 'per day · median fill and settle',
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
      subtitle: 'per day · most swaps settled in one hour',
      info: 'The busiest hour of each day: how many swaps completed within it. What the network has actually handled at once.',
      body: chart(derived.peakHour, swapsLoading, count, { integerY: true }),
      headerRight: readout(inRange(`${count(derived.rangePeakHour)} / hour`)),
    },
    {
      title: 'Peak concurrent transactions',
      subtitle: 'per day · most swaps open at once',
      info: 'The most swaps open at one moment each day, from every swap’s initiation and resolution times.',
      body: chart(derived.peakInFlight, swapsLoading, count, {
        integerY: true,
      }),
      headerRight: readout(inRange(count(derived.rangePeakInFlight))),
    },
    {
      title: 'Serving nodes',
      subtitle: 'per day · distinct nodes that settled a swap',
      info: 'How many distinct nodes completed at least one swap each day.',
      body: chart(derived.servingNodes, swapsLoading, count, {
        integerY: true,
      }),
      headerRight: readout(inRange(count(derived.rangeServingNodes))),
    },
    {
      title: 'Nodes ever served',
      subtitle: 'running total · distinct nodes',
      info: 'Running count of distinct hotkeys since launch, by the day each first completed a swap.',
      body: chart(derived.cumulativeNodes, swapsLoading, count, {
        integerY: true,
      }),
      headerRight: readout(`${count(tape.nodesEver)} all-time`),
    },
    {
      title: 'Volume by direction',
      subtitle: `in range · share of completed volume · ${money}`,
      info: 'How volume in the selected range splits by direction (asset sent → asset received), priced at current rates, with the number of swaps.',
      body: (
        <ShareList
          rows={derived.directions}
          loading={swapsLoading}
          usdMode={usdMode}
        />
      ),
      headerRight: readout(
        inRange(`${count(derived.rangeDirections)} directions`),
      ),
    },
    {
      title: 'Volume by hub',
      subtitle: `per day · volume by backing chain · ${money}`,
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

  // Each group reads top to bottom: its all-time figures, then its charts
  // over the selected range. Panel spans keep every row full.
  const panelByTitle = new Map(panels.map((p) => [p.title, p]));
  const renderPanel = (title: string) => {
    const p = panelByTitle.get(title)!;
    return (
      <Panel
        title={p.title}
        subtitle={p.subtitle}
        info={p.info}
        headerRight={p.headerRight}
      >
        {p.body}
      </Panel>
    );
  };

  // Reading order: the economics headline first, then growth (volume, then
  // users and nodes), then operational detail. Inside each group the
  // strongest signal leads and the fine print closes it.
  const groups: {
    caption: string;
    tiles: string[];
    panels: string[];
    lead?: React.ReactNode;
    span?: Record<string, { md: number; lg: number }>;
  }[] = [
    {
      caption: 'Overview',
      tiles: [
        'Total volume',
        'Protocol fees',
        'Annualized fees',
        'Total users',
      ],
      panels: [],
    },
    {
      caption: 'Fees',
      // The economics figures head the group, then one chart: fees by
      // source against what miners were paid.
      tiles: [],
      lead: (
        <DailyEconomics
          history={history}
          loading={historyLoading || historyPlaceholder}
          days={feeDays}
          income={dailyIncome}
        />
      ),
      panels: [],
    },
    {
      caption: 'Volume',
      tiles: [
        'Transactions',
        'Average transaction',
        'Largest transaction',
        'Active days',
      ],
      panels: [
        'Cumulative volume',
        'Volume',
        'Transactions',
        'Volume by hub',
        'Volume by direction',
      ],
      span: { 'Volume by direction': { md: 12, lg: 12 } },
    },
    {
      caption: 'Users and nodes',
      tiles: ['New users', 'Returning users', 'Nodes served', 'Active miners'],
      panels: ['Unique users', 'Nodes ever served', 'Users', 'Serving nodes'],
    },
    {
      caption: 'Reliability',
      tiles: [
        'Success rate',
        'Median settlement',
        'In flight now',
        'Timed out',
      ],
      panels: [
        'Success rate',
        'Settlement time',
        'Peak throughput',
        'Peak concurrent transactions',
      ],
    },
  ];
  const tileByLabel = new Map(tiles.map((t) => [t.label, t]));

  return (
    <Stack gap={{ xs: 5, md: 6 }}>
      {/* Pinned to the top of the page's scroll area (which starts below the
          nav) while the stats scroll past, so the range stays in reach beside
          every chart it drives. */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: theme.zIndex.appBar - 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          py: 1.25,
          backgroundColor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.62rem',
            color: 'text.secondary',
          }}
        >
          {/* Short enough to share the row with the range control; each
              chart's subtitle carries its own price basis. */}
          one column per UTC day · running totals count from launch
        </Typography>
        <RangeChips value={range} options={RANGES} onChange={setRange} />
      </Box>
      {groups.map((g, i) => (
        <Stack key={g.caption} gap={{ xs: 2, md: 3 }}>
          <Typography
            component="h3"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              // The pinned range bar already rules off the first group.
              borderTop: i === 0 ? 0 : 1,
              borderColor: 'divider',
              pt: i === 0 ? 0 : 2,
            }}
          >
            {g.caption}
          </Typography>
          {g.tiles.length > 0 && (
            <Grid container spacing={{ xs: 2, md: 3 }}>
              {g.tiles.map((label) => {
                const t = tileByLabel.get(label)!;
                return (
                  <Grid item xs={6} md={3} key={label}>
                    <StatCell
                      label={t.label}
                      value={t.value}
                      unit={t.unit}
                      loading={t.loading}
                      tooltip={t.tooltip}
                      delta={t.delta}
                    />
                  </Grid>
                );
              })}
            </Grid>
          )}
          {g.lead}
          {g.panels.length > 0 && (
            <Grid container spacing={{ xs: 2, md: 3 }}>
              {g.panels.map((title) => {
                return (
                  <Grid
                    item
                    xs={12}
                    md={g.span?.[title]?.md ?? 6}
                    lg={g.span?.[title]?.lg ?? 6}
                    key={title}
                  >
                    {renderPanel(title)}
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Stack>
      ))}
      <Methodology />
    </Stack>
  );
};

// Plain-language definitions under the charts, the way the established
// protocol dashboards publish their methodology next to the numbers.
const METHODOLOGY: [string, string][] = [
  [
    'Days',
    'One column per UTC day. Today is still filling: drawn outlined, and left out of every “vs prior” comparison so a partial day never reads as a drop.',
  ],
  [
    'Protocol fees',
    'The 1% transaction fee on every completed swap, plus reservation fees and quote churn fees paid in SOL. All of it funds buybacks. Transaction fees are valued at the swap’s hour; SOL fees at that day’s average SOL price.',
  ],
  [
    'Annualized fees',
    'Protocol fees per complete day in the range, times 365. A run-rate at the stated pace, not a forecast.',
  ],
  [
    'Emissions',
    'Estimated from four chain samples a day at that day’s prices: the owner’s cut comes off first, validators and miners split the rest, and part of the miner half is burned. Burned alpha was never emitted, so it is not in total emissions.',
  ],
  [
    'Vs prior',
    'The same number of complete days immediately before the range. ALL has no prior period.',
  ],
];

const Methodology: React.FC = () => (
  <Stack
    component="section"
    gap={1}
    sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}
  >
    <Typography
      component="h3"
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      How these numbers work
    </Typography>
    {METHODOLOGY.map(([term, text]) => (
      <Typography
        key={term}
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.62rem',
          lineHeight: 1.6,
          color: 'text.secondary',
          maxWidth: 820,
        }}
      >
        <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
          {term}.
        </Box>{' '}
        {text}
      </Typography>
    ))}
  </Stack>
);

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
