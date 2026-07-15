import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Box, Typography, useTheme, type Theme } from '@mui/material';
import { useAllSwaps, useCurrentCrown } from '../../api';
import {
  directionLabel,
  directionalRateFor,
  rateUnitFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { FONTS } from '../../theme';
import { formatRate } from '../../utils/format';
import {
  EMA_PERIOD,
  completedPoints,
  ema,
  robustYRange,
  tukeyClean,
  volumeByTime,
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

// Monochrome, matching the house chart style: the active series draws in the
// theme's primary text shade; a second overlaid direction falls back to the
// secondary shade so the two stay distinguishable. text.primary is a hex in
// both themes, which the gradient's alpha-suffix relies on.
const accentFor = (theme: Theme, index: number) =>
  index === 0 ? theme.palette.text.primary : theme.palette.text.secondary;

const labelFor = directionLabel;

// The market-rate chart. All rates render DIRECTIONALLY ("to per 1 from" —
// completedPoints converts the canonical stored values; the crown reference is
// converted here). With one direction it shows that direction's scatter + EMA
// (with a gradient area fill), live crown reference, and per-timestamp volume
// with a max-volume marker. With two directions it overlays both on a single
// shared price scale — only meaningful for same-orientation directions (e.g.
// SOL→BTC vs SOL→TAO); a forward and its reverse now live on reciprocal
// scales. Both modes run through one option builder; the few visual
// differences are gated on the number of directions.
const MarketRateChart: React.FC<{
  directions: Direction[];
  fill?: boolean;
}> = ({ directions, fill }) => {
  const theme = useTheme();
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
          vol: volumeByTime(clean),
        };
      }),
    [swaps, directions],
  );

  const totalClean = series.reduce((n, s) => n + s.clean.length, 0);

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

    const prepared = series.map((s, i) => ({
      ...s,
      accent: accentFor(theme, i),
      // Directional, matching the (already-converted) scatter/EMA scale.
      crownRate: directionalRateFor(s.dir, crown?.[s.dir]?.rate),
    }));

    // One shared price range across every direction's rates + EMAs + crowns, so
    // the gap between overlaid lines reads as the true spread and a single
    // direction keeps the EMA/crown on-axis. EMA is "soft" (padded); crown is
    // "hard" — pulled flush to the edge rather than padded past.
    const crowns = prepared
      .map((s) => s.crownRate)
      .filter((v): v is number => v != null);
    const yRange = robustYRange(
      prepared.flatMap((s) => s.rates),
      { soft: prepared.flatMap((s) => s.ema), hard: crowns },
    );

    // Adaptive y-axis precision: a wide span (e.g. once a far-off crown rate is
    // included) reads fine as integers, but a tight band would collapse every
    // tick to the same rounded value — so show decimals when the span is small.
    // Below 0.01 a fixed 2dp collapsed a whole SOL→BTC axis (~0.0021 BTC/SOL)
    // to "0.00", so scale the decimals to the span's magnitude instead.
    const ySpan = yRange ? yRange.max - yRange.min : 0;
    const yDecimals =
      ySpan <= 0
        ? 4
        : ySpan >= 10
          ? 0
          : ySpan >= 1
            ? 1
            : Math.min(8, Math.ceil(-Math.log10(ySpan)) + 1);
    const yAxisLabel = {
      color: axisColor,
      fontFamily: FONTS.mono,
      fontSize: 9,
      formatter: (v: number) => v.toFixed(yDecimals),
    };

    // Shared time x-range (unix seconds) so the price and volume grids — and
    // both directions — line up exactly.
    const times = prepared.flatMap((s) => s.clean.map((p) => p.t));
    const xMin = times.length ? Math.min(...times) : undefined;
    const xMax = times.length ? Math.max(...times) : undefined;
    // Floor the padding at a real interval: with one swap in the window the
    // old ±1s pad made a 2-second axis whose every tick label rounded to the
    // same HH:MM.
    const xPad =
      xMin != null && xMax != null
        ? Math.max((xMax - xMin) * 0.02, xMax === xMin ? 900 : 30)
        : 0;
    const xBounds =
      xMin != null && xMax != null
        ? { min: xMin - xPad, max: xMax + xPad }
        : {};

    // Volume is the SOL numeraire for both directions, so it shares one axis.
    const maxVol = Math.max(
      0,
      ...prepared.flatMap((s) => s.vol.map((v) => v.vol)),
    );

    // Time axis labels (unix seconds → HH:MM).
    const timeAxisLabel = {
      color: axisColor,
      fontFamily: FONTS.mono,
      fontSize: 9,
      formatter: (v: number) =>
        new Date(v * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      hideOverlap: true,
    };

    // Dashed reference line at a direction's live crown rate so the chart shows
    // where "now" sits versus recent fills. Keep the label inside the frame:
    // when the crown sits in the top half, render below it, else above.
    const crownMarkLine = (rate: number | null, unit: string, color: string) =>
      rate != null
        ? {
            silent: true,
            symbol: 'none',
            data: [{ yAxis: rate }],
            lineStyle: { color, type: 'dashed', width: 1, opacity: 0.8 },
            label: {
              position:
                yRange && yRange.max - rate < rate - yRange.min
                  ? 'insideStartBottom'
                  : 'insideStartTop',
              color,
              fontFamily: FONTS.mono,
              fontSize: 9,
              formatter: `crown ${formatRate(rate)} ${unit}`,
            },
          }
        : undefined;

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
        data: s.clean.map((p) => [p.t, p.rate]),
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
        data: s.clean.map((p, i) => [p.t, s.ema[i]]),
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
        markLine: crownMarkLine(
          s.crownRate,
          rateUnitFor(s.dir),
          single ? crownColor : s.accent,
        ),
      },
    ]);

    // Volume overlays the price pane TradingView-style: same grid, hidden
    // second y-axis whose max is 4× the tallest bar so the bars hug the bottom
    // quarter and never collide with the price line. z below the price series.
    const volumeSeries =
      maxVol > 0
        ? prepared.map((s) => ({
            name: single ? 'Volume' : labelFor(s.dir),
            type: 'bar',
            xAxisIndex: 0,
            yAxisIndex: 1,
            data: s.vol.map((v) => [v.t, v.vol]),
            itemStyle: { color: s.accent, opacity: single ? 0.25 : 0.22 },
            barWidth: 5,
            z: 1,
            // Overlap the two directions' bars on the same slot.
            ...(single ? {} : { barGap: '-100%' }),
          }))
        : [];

    chart.setOption(
      {
        animation: false,
        // One pane: price and volume share the grid and x-axis.
        grid: [{ left: 48, right: 14, top: 8, bottom: 22 }],
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
            const t = params[0]?.axisValue;
            // Rate series carry their direction's unit; single mode names them
            // 'Rate'/'EMA', so fall back to the lone direction's unit.
            const fallbackUnit = rateUnitFor(prepared[0].dir);
            const unitByName = new Map(
              prepared.map((s) => [labelFor(s.dir), rateUnitFor(s.dir)]),
            );
            const lines = params
              .map((p) => {
                const v = Array.isArray(p.value) ? p.value[1] : p.value;
                const isVolume = p.seriesName === 'Volume';
                const unit = isVolume
                  ? 'SOL vol'
                  : (unitByName.get(p.seriesName) ?? fallbackUnit);
                // Volume is an amount (2dp reads fine); a rate needs sig figs
                // or SOL→BTC (~0.0021 BTC/SOL) shows as "0.00".
                const shown = isVolume
                  ? Number(v).toFixed(2)
                  : formatRate(Number(v));
                return `${p.seriesName}: ${shown} ${unit}`;
              })
              .join('<br/>');
            return `${new Date(Number(t) * 1000).toLocaleString()}<br/>${lines}`;
          },
        },
        xAxis: [
          {
            type: 'value',
            scale: true,
            gridIndex: 0,
            ...xBounds,
            axisLabel: timeAxisLabel,
            axisLine: { lineStyle: { color: gridColor } },
            axisTick: { show: false },
            splitLine: { show: false },
          },
        ],
        yAxis: [
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
            // Hidden overlay axis for volume: 4× the tallest bar keeps the
            // bars in the bottom quarter of the pane (tooltip carries the
            // numbers, so no visible scale needed).
            type: 'value',
            gridIndex: 0,
            min: 0,
            max: maxVol > 0 ? maxVol * 4 : undefined,
            show: false,
          },
        ],
        series: [...priceSeries, ...volumeSeries],
      },
      true,
    );
  }, [series, theme, crown]);

  const single = series.length === 1;
  const countLabel = single
    ? series[0].clean.length
      ? `${series[0].clean.length} swaps${series[0].hidden ? ` · ${series[0].hidden} outlier${series[0].hidden > 1 ? 's' : ''} hidden` : ''} · EMA${EMA_PERIOD}`
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
