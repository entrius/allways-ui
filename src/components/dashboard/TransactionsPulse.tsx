import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as echarts from 'echarts/core';
import { EffectScatterChart, ScatterChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Box, Typography, useTheme } from '@mui/material';
import { useAllSwaps, useCompleteSwapHistory } from '../../api';
import type { ActiveSwap } from '../../api/models';
import { MOVE_COLORS, RANGE_SECS, type HeroRange } from './AllwaysMarketRate';
import RangeChips from '../RangeChips';
import { FONTS } from '../../theme';
import { formatAmount, formatDurationSecs } from '../../utils/format';
import { hubChain } from '../../api/models/chains';
import {
  applyTxFilters,
  countActiveFilters,
  filtersFromParams,
} from './txFilters';

echarts.use([
  ScatterChart,
  EffectScatterChart,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
]);

// Same lookback windows as the market hero chart, via its shared RANGE_SECS.
const RANGES: readonly HeroRange[] = ['1H', '1D', '1W', '1M'];

const TERMINAL = new Set(['COMPLETED', 'TIMED_OUT']);

// One chart datum: value = [initiated (unix secs), duration (secs)], plus the
// swap fields the tooltip and click-through need.
type PulseDatum = {
  value: [number, number];
  symbolSize: number;
  swapId: string;
  seq: number | null;
  route: string | null;
  status: string;
  timeoutAt: number | null;
};

// Dot area tracks the swap's SOL-leg notional so big transactions read big.
const sizeFor = (swap: ActiveSwap): number => {
  const lamports =
    swap.sourceChain?.toLowerCase() === hubChain()
      ? swap.sourceAmount
      : (swap.destAmount ?? swap.solAmount);
  const sol = lamports ? parseInt(lamports, 10) / 1e9 : 0;
  return Math.min(16, 4 + 4 * Math.sqrt(Math.max(0, sol)));
};

const routeFor = (swap: ActiveSwap): string | null =>
  swap.sourceAmount && swap.sourceChain && swap.destAmount && swap.destChain
    ? `${formatAmount(swap.sourceAmount, swap.sourceChain)} → ${formatAmount(swap.destAmount, swap.destChain)}`
    : null;

// Duration tick labels: seconds under a minute, then minutes/hours. Ticks
// land on round multiples of the chosen interval, so at most one decimal.
const durationTick = (v: number): string => {
  if (v >= 3600) {
    const h = v / 3600;
    return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
  }
  if (v >= 60) {
    const m = v / 60;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}m`;
  }
  return `${v}s`;
};

// A linear y-axis keeps vertical distance proportional to real time (a log
// scale made 30s and 10m read as neighbors). Ticks snap to round time units:
// the smallest step that covers the slowest swap in ≤5 gridlines.
const TICK_STEPS = [15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200];
const yScaleFor = (maxDur: number): { max: number; interval: number } => {
  const interval =
    TICK_STEPS.find((s) => maxDur / s <= 5) ??
    TICK_STEPS[TICK_STEPS.length - 1];
  return {
    max: Math.max(1, Math.ceil(maxDur / interval)) * interval,
    interval,
  };
};

// Every transaction as a dot: x = when it started, y = how long it took to
// settle — green completed, red timed out, sized by SOL notional.
// In-flight swaps ripple and RISE in real time (y = elapsed so far) until
// they land as a terminal color. Click any dot for the swap's full timeline.
const TransactionsPulse: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [range, setRange] = useState<HeroRange>('1D');
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  // Recent 50 arrive instantly and are SSE-invalidated (the live layer); the
  // complete walk backfills the longer windows and refetches on the SSE
  // fallback interval. Merged by swapId with the live layer winning.
  const { data: recent, isLoading: recentLoading } = useAllSwaps({ limit: 50 });
  const { data: history } = useCompleteSwapHistory();

  // The chart obeys the same URL-backed find filters as the tape, so both
  // always show one filtered dataset.
  const [searchParams] = useSearchParams();
  const filters = useMemo(
    () => filtersFromParams(searchParams),
    [searchParams],
  );
  const filtersActive = countActiveFilters(filters) > 0;
  // An active date filter takes over the chart's time window — otherwise a
  // past date range and a "last N from now" lookback can have an empty
  // intersection (blank chart while the tape shows matches). The range chips
  // only rule when no dates are set.
  const dateFromSec = filters.dateFrom
    ? Date.parse(`${filters.dateFrom}T00:00:00`) / 1000
    : null;
  const dateToSec = filters.dateTo
    ? Date.parse(`${filters.dateTo}T23:59:59`) / 1000
    : null;
  const hasDateWindow = dateFromSec != null || dateToSec != null;

  const swaps = useMemo(() => {
    const byId = new Map<string, ActiveSwap>();
    for (const s of history ?? []) byId.set(s.swapId, s);
    for (const s of recent ?? []) byId.set(s.swapId, s);
    const all = [...byId.values()];
    return filtersActive ? applyTxFilters(all, filters) : all;
  }, [history, recent, filters, filtersActive]);

  const hasInFlight = useMemo(
    () => swaps.some((s) => !TERMINAL.has(s.status)),
    [swaps],
  );

  // Claimed-but-not-yet-initiated swaps have no on-chain timestamp until
  // validator quorum; anchor them at first sighting so every in-flight
  // transaction gets a dot immediately and starts rising.
  const firstSeenRef = useRef(new Map<string, number>());

  // The clock that streams the x-axis and lifts the in-flight dots: every
  // second while something is in flight, lazily otherwise. Skips hidden tabs.
  useEffect(() => {
    const id = setInterval(
      () => {
        if (!document.hidden) setNowSec(Math.floor(Date.now() / 1000));
      },
      hasInFlight ? 1_000 : 30_000,
    );
    return () => clearInterval(id);
  }, [hasInFlight]);

  const { completed, timedOut, inFlight, medianSecs } = useMemo(() => {
    // Date-filtered rows are already cut to their window by applyTxFilters.
    const windowStart = hasDateWindow ? -Infinity : nowSec - RANGE_SECS[range];
    const completed: PulseDatum[] = [];
    const timedOut: PulseDatum[] = [];
    const inFlight: PulseDatum[] = [];
    for (const s of swaps) {
      const terminal = TERMINAL.has(s.status);
      let t = s.initiatedAt ? parseInt(s.initiatedAt, 10) : NaN;
      if (!Number.isFinite(t) || t <= 0) {
        // No on-chain timestamp yet. Terminal rows without one can't be
        // placed; in-flight rows anchor at first sighting (and snap to the
        // real initiated time once quorum stamps it).
        if (terminal) continue;
        const seen = firstSeenRef.current.get(s.swapId) ?? nowSec;
        firstSeenRef.current.set(s.swapId, seen);
        t = seen;
      }
      if (t < windowStart) continue;
      const endRaw = s.resolvedAt ?? s.completedAt;
      const end = endRaw ? parseInt(endRaw, 10) : null;
      // Terminal rows keep their real duration; in-flight rows show elapsed
      // so far, which the 1s clock walks upward.
      const dur = Math.max(0, (terminal && end != null ? end : nowSec) - t);
      if (terminal && end == null) continue;
      const datum: PulseDatum = {
        value: [t, dur],
        symbolSize: sizeFor(s),
        swapId: s.swapId,
        seq: s.seq,
        route: routeFor(s),
        status: s.status,
        timeoutAt: s.timeoutAt ? parseInt(s.timeoutAt, 10) : null,
      };
      if (!terminal) inFlight.push(datum);
      else if (s.status === 'COMPLETED') completed.push(datum);
      else timedOut.push(datum);
    }
    const settled = completed.map((d) => d.value[1]).sort((a, b) => a - b);
    const medianSecs = settled.length
      ? settled[Math.floor(settled.length / 2)]
      : null;
    return { completed, timedOut, inFlight, medianSecs };
  }, [swaps, nowSec, range, hasDateWindow]);

  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Init once; dots deep-link to the swap detail page.
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current, undefined, {
      renderer: 'canvas',
    });
    chartRef.current = chart;
    chart.on('click', (params) => {
      const d = (params as { data?: PulseDatum }).data;
      if (d?.swapId) navigateRef.current(`/swap/${d.swapId}`);
    });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // Repaint on data / clock / theme change.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const move = MOVE_COLORS[theme.palette.mode];
    const inFlightColor = theme.palette.text.primary;
    const axisColor = theme.palette.text.secondary;
    const gridColor = theme.palette.divider;

    // A date filter pins the x-window to its own bounds; the range chips
    // only apply without one. An open-ended bound falls back to the data.
    const times = [...completed, ...timedOut, ...inFlight].map(
      (d) => d.value[0],
    );
    const xMax = dateToSec ?? nowSec;
    const xMin = hasDateWindow
      ? (dateFromSec ??
        (times.length ? Math.min(...times) - 900 : xMax - RANGE_SECS[range]))
      : nowSec - RANGE_SECS[range];
    const wideWindow = xMax - xMin > 172_800;

    const maxDur = Math.max(
      0,
      ...[...completed, ...timedOut, ...inFlight].map((d) => d.value[1]),
    );
    const yScale = yScaleFor(maxDur || 600);

    const statusColor: Record<string, string> = {
      COMPLETED: move.up,
      TIMED_OUT: move.down,
    };

    chart.setOption({
      animation: true,
      animationDuration: 300,
      grid: [{ left: 44, right: 14, top: 10, bottom: 22 }],
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.border.medium,
        borderWidth: 1,
        textStyle: {
          color: theme.palette.text.primary,
          fontFamily: FONTS.mono,
          fontSize: 11,
        },
        formatter: (params: unknown) => {
          const d = (params as { data?: PulseDatum }).data;
          if (!d) return '';
          const started = new Date(d.value[0] * 1000).toLocaleString();
          const color = statusColor[d.status] ?? inFlightColor;
          const statusLine = `<span style="color:${color}">${d.status.replace('_', ' ')}</span>`;
          const durLine = TERMINAL.has(d.status)
            ? `settled in ${formatDurationSecs(d.value[1])}`
            : `in flight ${formatDurationSecs(d.value[1])}${
                d.timeoutAt && d.timeoutAt > nowSec
                  ? ` · times out in ${formatDurationSecs(d.timeoutAt - nowSec)}`
                  : ''
              }`;
          return [
            `#${d.seq ?? '—'} · ${statusLine}`,
            ...(d.route ? [d.route] : []),
            durLine,
            started,
          ].join('<br/>');
        },
      },
      xAxis: [
        {
          type: 'value',
          min: xMin,
          max: xMax,
          axisLabel: {
            color: axisColor,
            fontFamily: FONTS.mono,
            fontSize: 9,
            hideOverlap: true,
            formatter: (v: number) =>
              wideWindow
                ? new Date(v * 1000).toLocaleDateString([], {
                    month: 'numeric',
                    day: 'numeric',
                  })
                : new Date(v * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
          },
          axisLine: { lineStyle: { color: gridColor } },
          axisTick: { show: false },
          splitLine: { show: false },
        },
      ],
      yAxis: [
        {
          type: 'value',
          min: 0,
          max: yScale.max,
          interval: yScale.interval,
          axisLabel: {
            color: axisColor,
            fontFamily: FONTS.mono,
            fontSize: 9,
            formatter: durationTick,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          // Solid, matching the markets hero's grid style.
          splitLine: { lineStyle: { color: gridColor, type: 'solid' } },
        },
      ],
      series: [
        {
          name: 'Completed',
          type: 'scatter',
          data: completed,
          itemStyle: { color: move.up, opacity: 0.75 },
          // Terminal dots never move; skip update animation so window shifts
          // don't make history slide around.
          animationDurationUpdate: 0,
          z: 3,
        },
        {
          name: 'Timed out',
          type: 'scatter',
          data: timedOut,
          itemStyle: { color: move.down, opacity: 0.8 },
          animationDurationUpdate: 0,
          z: 4,
        },
        {
          name: 'In flight',
          type: 'effectScatter',
          data: inFlight,
          itemStyle: { color: inFlightColor, opacity: 0.9 },
          rippleEffect: { brushType: 'stroke', scale: 3, period: 3 },
          // Glide between clock ticks so live dots rise smoothly.
          animationDurationUpdate: 950,
          animationEasingUpdate: 'linear',
          z: 5,
        },
      ],
    });
  }, [
    completed,
    timedOut,
    inFlight,
    nowSec,
    range,
    theme,
    hasDateWindow,
    dateFromSec,
    dateToSec,
  ]);

  const total = completed.length + timedOut.length;
  const successPct = total
    ? Math.round((completed.length / total) * 100)
    : null;

  const legendItems = [
    {
      label: `${completed.length} completed`,
      color: MOVE_COLORS[theme.palette.mode].up,
    },
    {
      label: `${timedOut.length} timed out`,
      color: MOVE_COLORS[theme.palette.mode].down,
    },
    {
      label: `${inFlight.length} in flight`,
      color: theme.palette.text.primary,
    },
  ];

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        p: { xs: 1.25, sm: 1.5 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 0.75,
        }}
      >
        {/* Legend doubles as the window's live tally — identity is carried by
            the label text, the dot only echoes the series color. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            columnGap: 1.5,
            rowGap: 0.25,
          }}
        >
          {legendItems.map((item) => (
            <Typography
              key={item.label}
              component="span"
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.62rem',
                color: 'text.secondary',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                whiteSpace: 'nowrap',
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  flexShrink: 0,
                }}
              />
              {item.label}
            </Typography>
          ))}
          {(successPct != null || medianSecs != null) && (
            <Typography
              component="span"
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.62rem',
                color: 'text.disabled',
                whiteSpace: 'nowrap',
              }}
            >
              {successPct != null && `${successPct}% success`}
              {successPct != null && medianSecs != null && ' · '}
              {medianSecs != null &&
                `median settle ${formatDurationSecs(medianSecs)}`}
            </Typography>
          )}
        </Box>
        <RangeChips value={range} options={RANGES} onChange={setRange} />
      </Box>

      {/* Keep the container mounted so echarts.init has a real element before
          the first swaps load; overlay the empty state. */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: 190, sm: 230 },
        }}
      >
        <Box ref={elRef} sx={{ width: '100%', height: '100%' }} />
        {total + inFlight.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONTS.mono,
              fontSize: '0.72rem',
              color: 'text.secondary',
              pointerEvents: 'none',
            }}
          >
            {recentLoading
              ? 'Loading transactions…'
              : 'No transactions in this window'}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TransactionsPulse;
