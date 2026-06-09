import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import {
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  type Theme,
} from '@mui/material';
import { useAllSwaps, useCrownRateHistory, useCurrentCrown } from '../../api';
import type {
  CrownRateHistoryRow,
  Direction,
} from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import {
  EMA_PERIOD,
  completedPoints,
  ema,
  robustYRange,
  tukeyClean,
  volumeByBlock,
} from './marketRate';

echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

const accentFor = (theme: Theme, dir: Direction) =>
  dir === 'BTC-TAO' ? theme.palette.asset.btc : theme.palette.primary.main;

const labelFor = (dir: Direction) =>
  dir === 'BTC-TAO' ? 'BTC → TAO' : 'TAO → BTC';

// The market-rate chart. With one direction it shows that direction's scatter +
// EMA (with a gradient area fill), live crown reference, and per-block volume
// with a max-volume marker. With two directions it overlays both on a single
// shared price scale — the vertical gap between the two EMA lines IS the
// directional spread — drawing each in its own accent (BTC orange / primary
// blue) over a shared block x-axis and a shared τ-volume sub-chart. Both modes
// run through one option builder; the few visual differences are gated on the
// number of directions.
const MarketRateChart: React.FC<{
  directions: Direction[];
  fill?: boolean;
}> = ({ directions, fill }) => {
  const theme = useTheme();
  // Drop the volume sub-chart on small/stacked screens — too cramped on mobile.
  const showVolume = !useMediaQuery(theme.breakpoints.down('md'));
  const { data: swaps } = useAllSwaps({ limit: 600 });
  const { data: crown } = useCurrentCrown();
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  // Prepared series per direction: outlier-cleaned points, EMA, and volume.
  const series = useMemo(
    () =>
      directions.map((dir) => {
        const { clean, hidden } = tukeyClean(completedPoints(swaps, dir));
        const rates = clean.map((p) => p.rate);
        return {
          dir,
          clean,
          hidden,
          rates,
          ema: ema(rates, EMA_PERIOD),
          vol: volumeByBlock(clean),
        };
      }),
    [swaps, directions],
  );

  const totalClean = series.reduce((n, s) => n + s.clean.length, 0);

  // Crown rate-history window: cover the shown fills' block span plus ~1h of
  // forward headroom so the step line reaches the live tip the backend stitches
  // on (it can sit ahead of the last fill). Clamped to a sane floor/ceiling.
  const crownBlocks = useMemo(() => {
    const bs = series.flatMap((s) => s.clean.map((p) => p.block));
    if (bs.length < 2) return 1200;
    const span = Math.max(...bs) - Math.min(...bs);
    return Math.min(28_800, Math.max(300, span + 300));
  }, [series]);

  // Both directions are fetched unconditionally (fixed hook count regardless of
  // how many are shown) and picked per shown direction below. The queries are
  // light and refresh on the crown cadence (~12s).
  const btcTaoCrown = useCrownRateHistory({
    direction: 'BTC-TAO',
    blocks: crownBlocks,
  });
  const taoBtcCrown = useCrownRateHistory({
    direction: 'TAO-BTC',
    blocks: crownBlocks,
  });
  const crownByDir = useMemo<Record<Direction, CrownRateHistoryRow[]>>(
    () => ({
      'BTC-TAO': btcTaoCrown.data ?? [],
      'TAO-BTC': taoBtcCrown.data ?? [],
    }),
    [btcTaoCrown.data, taoBtcCrown.data],
  );

  // Init once.
  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current, undefined, {
      renderer: 'canvas',
    });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // Repaint on data / theme change.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const single = series.length === 1;
    const axisColor = theme.palette.text.secondary;
    const gridColor = theme.palette.divider;
    const crownColor = theme.palette.text.secondary;

    const prepared = series.map((s) => ({
      ...s,
      accent: accentFor(theme, s.dir),
      crownRate: crown?.[s.dir]?.rate ?? null,
      crownHist: crownByDir[s.dir] ?? [],
    }));

    // Block window from the executed fills. The crown step line is clipped to
    // start at the oldest fill (xMin) so older crown history doesn't stretch the
    // axis left and compress the fills; its right edge (the live tip) can sit
    // ahead of the last fill, so it extends xMax below.
    const swapBlocks = prepared.flatMap((s) => s.clean.map((p) => p.block));
    const xMin = swapBlocks.length ? Math.min(...swapBlocks) : undefined;
    const crownShown = prepared.map((s) => ({
      dir: s.dir,
      accent: s.accent,
      pts:
        xMin == null ? s.crownHist : s.crownHist.filter((p) => p.block >= xMin),
    }));
    const crownLineRates = crownShown.flatMap((c) => c.pts.map((p) => p.rate));

    // One shared price range across every direction's fills + EMAs + crown line,
    // so the gap between overlaid lines reads as the true spread and a single
    // direction keeps everything on-axis. Fills set the robust core; EMA and the
    // crown step line are "soft" (must-show, padded); the live crown level is
    // "hard" — pulled flush to the edge rather than padded past.
    const crowns = prepared
      .map((s) => s.crownRate)
      .filter((v): v is number => v != null);
    const yRange = robustYRange(
      prepared.flatMap((s) => s.rates),
      {
        soft: [...prepared.flatMap((s) => s.ema), ...crownLineRates],
        hard: crowns,
      },
    );

    // Adaptive y-axis precision: a wide span (e.g. once a far-off crown rate is
    // included) reads fine as integers, but a tight band would collapse every
    // tick to the same rounded value — so show decimals when the span is small.
    const ySpan = yRange ? yRange.max - yRange.min : 0;
    const yDecimals = ySpan >= 10 ? 0 : ySpan >= 1 ? 1 : 2;
    const yAxisLabel = {
      color: axisColor,
      fontFamily: FONTS.mono,
      fontSize: 9,
      formatter: (v: number) => v.toFixed(yDecimals),
    };

    // Shared block x-range so the price and volume grids — and both directions
    // — line up exactly. xMin comes from the fills (above); the right edge
    // follows the crown line out to the live tip when it leads the last fill.
    const xMax = (() => {
      const right = [
        ...swapBlocks,
        ...crownShown.flatMap((c) => c.pts.map((p) => p.block)),
      ];
      return right.length ? Math.max(...right) : undefined;
    })();
    const xPad = xMin != null && xMax != null ? (xMax - xMin) * 0.02 || 1 : 0;
    const xBounds =
      xMin != null && xMax != null
        ? { min: xMin - xPad, max: xMax + xPad }
        : {};

    // Both directions trade in τ, so per-block volume shares one axis.
    const maxVol = Math.max(
      0,
      ...prepared.flatMap((s) => s.vol.map((v) => v.vol)),
    );
    // Compact τ-volume label: keep it short for the cramped volume axis.
    const fmtVol = (v: number) =>
      v >= 1000
        ? `${(v / 1000).toFixed(1)}k`
        : v >= 10
          ? v.toFixed(0)
          : v.toFixed(1);

    // Block-height axis labels. One decimal of "k" so a ~2k-block window
    // doesn't collapse every tick to the same "8291k"; e.g. 8,291,200 →
    // "8291.2k". Shown on the volume axis when present, else on the price axis.
    const blockAxisLabel = {
      color: axisColor,
      fontFamily: FONTS.mono,
      fontSize: 9,
      formatter: (v: number) => `${(v / 1000).toFixed(1)}k`,
      hideOverlap: true,
    };

    // Crown "market rate" step line per direction: the best executable rate over
    // time, held flat between handoffs and stepping at each change (piecewise
    // constant), out to the live tip the backend stitches on. Drawn under the
    // EMA + scatter (z:2) as a backdrop. The single-direction live value is
    // shown in the count line above, so no inline label is needed here.
    const crownSeries = crownShown
      .filter((c) => c.pts.length > 0)
      .map((c) => ({
        name: single ? 'Crown' : `${labelFor(c.dir)} crown`,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        step: 'end',
        showSymbol: false,
        data: c.pts.map((p) => [p.block, p.rate]),
        lineStyle: {
          color: single ? crownColor : c.accent,
          width: 1.5,
          type: 'dashed',
          opacity: 0.9,
        },
        z: 2,
      }));

    const priceSeries = prepared.flatMap((s) => [
      {
        // Single direction reads as "Rate"; overlaid directions are named so the
        // tooltip and color tell them apart.
        name: single ? 'Rate' : labelFor(s.dir),
        type: 'scatter',
        xAxisIndex: 0,
        yAxisIndex: 0,
        symbolSize: 5,
        // Render above the EMA line + area so every executed swap is visible.
        z: 5,
        data: s.clean.map((p) => [p.block, p.rate]),
        itemStyle: { color: s.accent, opacity: 0.7 },
      },
      {
        // EMA shares the legend/tooltip entry with its scatter via the name.
        name: single ? 'EMA' : labelFor(s.dir),
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: true,
        // Constrain the spline so it never overshoots the data between points —
        // keeps the curve smooth without the bowing `smooth` alone introduces
        // over unevenly-spaced (by block) points.
        smoothMonotone: 'x',
        showSymbol: false,
        data: s.clean.map((p, i) => [p.block, s.ema[i]]),
        lineStyle: { color: s.accent, width: 2 },
        // Single direction gets the trading-terminal gradient fill; overlaid
        // lines skip it so two fills don't muddy the shared band.
        ...(single && {
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${s.accent}40` },
              { offset: 1, color: `${s.accent}00` },
            ]),
          },
        }),
        z: 3,
      },
    ]);

    const volumeSeries =
      showVolume && maxVol > 0
        ? prepared.map((s, i) => ({
            name: single ? 'Volume' : labelFor(s.dir),
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: s.vol.map((v) => [v.block, v.vol]),
            itemStyle: { color: s.accent, opacity: single ? 0.32 : 0.3 },
            barWidth: 5,
            // Overlap the two directions' bars on the same slot.
            ...(single ? {} : { barGap: '-100%' }),
            // Dotted reference at the largest single-block volume so the other
            // bars read relative to the peak — single direction only (a shared
            // max across two directions would be ambiguous).
            ...(single && i === 0
              ? {
                  markLine: {
                    silent: true,
                    symbol: 'none',
                    data: [{ yAxis: maxVol }],
                    lineStyle: {
                      color: crownColor,
                      type: 'dotted',
                      width: 1,
                      opacity: 0.8,
                    },
                    label: {
                      position: 'insideEndTop',
                      color: axisColor,
                      fontFamily: FONTS.mono,
                      fontSize: 8,
                      formatter: `max ${fmtVol(maxVol)}τ`,
                    },
                  },
                }
              : {}),
          }))
        : [];

    chart.setOption(
      {
        animation: false,
        // Price grid on top, volume grid below (desktop). On mobile the volume
        // grid is dropped and price fills the full height.
        grid: showVolume
          ? [
              { left: 48, right: 14, top: 8, height: '60%' },
              { left: 48, right: 14, top: '74%', bottom: 22 },
            ]
          : // Mobile: tighter gutters so the plot fills the narrow width.
            [{ left: 34, right: 8, top: 6, bottom: 18 }],
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        tooltip: {
          trigger: 'axis',
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.border.medium,
          borderWidth: 1,
          textStyle: {
            color: theme.palette.text.primary,
            fontFamily: FONTS.mono,
            fontSize: 11,
          },
          formatter: (
            params: {
              axisValue: number;
              seriesName: string;
              value: number[];
            }[],
          ) => {
            const block = params[0]?.axisValue;
            const lines = params
              .map((p) => {
                const v = Array.isArray(p.value) ? p.value[1] : p.value;
                const unit = p.seriesName === 'Volume' ? 'τ vol' : 'τ';
                return `${p.seriesName}: ${Number(v).toFixed(2)} ${unit}`;
              })
              .join('<br/>');
            return `blk #${Number(block).toLocaleString()}<br/>${lines}`;
          },
        },
        xAxis: showVolume
          ? [
              {
                type: 'value',
                scale: true,
                gridIndex: 0,
                ...xBounds,
                axisLabel: { show: false },
                axisLine: { lineStyle: { color: gridColor } },
                axisTick: { show: false },
                splitLine: { show: false },
              },
              {
                type: 'value',
                scale: true,
                gridIndex: 1,
                ...xBounds,
                axisLabel: blockAxisLabel,
                axisLine: { lineStyle: { color: gridColor } },
                axisTick: { show: false },
                splitLine: { show: false },
              },
            ]
          : [
              {
                type: 'value',
                scale: true,
                gridIndex: 0,
                ...xBounds,
                axisLabel: blockAxisLabel,
                axisLine: { lineStyle: { color: gridColor } },
                axisTick: { show: false },
                splitLine: { show: false },
              },
            ],
        yAxis: showVolume
          ? [
              {
                type: 'value',
                scale: true,
                gridIndex: 0,
                ...(yRange ? { min: yRange.min, max: yRange.max } : {}),
                axisLabel: yAxisLabel,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
              },
              {
                type: 'value',
                gridIndex: 1,
                min: 0,
                // Headroom above the tallest bar so the max-volume line and its
                // label sit clear of the bar top rather than flush at the edge.
                max: maxVol > 0 ? maxVol * 1.2 : undefined,
                splitNumber: 2,
                axisLabel: {
                  color: axisColor,
                  fontFamily: FONTS.mono,
                  fontSize: 8,
                  formatter: fmtVol,
                },
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: {
                  lineStyle: { color: gridColor, type: 'dashed', opacity: 0.4 },
                },
              },
            ]
          : [
              {
                type: 'value',
                scale: true,
                gridIndex: 0,
                ...(yRange ? { min: yRange.min, max: yRange.max } : {}),
                axisLabel: yAxisLabel,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
              },
            ],
        series: [...crownSeries, ...priceSeries, ...volumeSeries],
      },
      true,
    );
  }, [series, theme, crown, crownByDir, showVolume]);

  const single = series.length === 1;
  const singleCrownRate = single
    ? (crown?.[series[0].dir]?.rate ?? null)
    : null;
  const crownSuffix =
    singleCrownRate != null ? ` · crown ${singleCrownRate.toFixed(2)}τ` : '';
  const countLabel = single
    ? series[0].clean.length
      ? `${series[0].clean.length} swaps${series[0].hidden ? ` · ${series[0].hidden} outlier${series[0].hidden > 1 ? 's' : ''} hidden` : ''} · EMA${EMA_PERIOD}${crownSuffix}`
      : ''
    : totalClean
      ? `${series.map((s) => s.clean.length).join('+')} swaps · EMA${EMA_PERIOD}`
      : '';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        ...(fill && { flex: 1, height: '100%' }),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.6rem',
            color: 'text.disabled',
          }}
        >
          {countLabel}
        </Typography>
      </Box>
      {/* The chart container must stay mounted so echarts.init has a real
          element even before the first swaps load; overlay the empty state. */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          ...(fill ? { flex: 1, minHeight: 120 } : { height: 150 }),
        }}
      >
        <Box ref={elRef} sx={{ width: '100%', height: '100%' }} />
        {totalClean === 0 && (
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
            }}
          >
            No completed swaps yet
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MarketRateChart;
