import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useAllSwaps, useCurrentCrown } from '../../api';
import type { Direction } from '../../api/models/MinersDashboard';
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

// Both directions quote in τ on the same price scale, so they share one y-axis
// — the vertical gap between the two EMA lines IS the directional spread, which
// is the whole point of this view. BTC→TAO is drawn in BTC orange, TAO→BTC in
// primary; each gets a scatter of executed swaps + an EMA line + its live crown
// reference, over a shared block-height x-axis. A volume sub-chart below shows
// per-block τ volume for both directions on a shared scale.
const CombinedMarketRateChart: React.FC<{ fill?: boolean }> = ({ fill }) => {
  const theme = useTheme();
  // Drop the volume sub-chart on small/stacked screens — too cramped on mobile.
  const showVolume = !useMediaQuery(theme.breakpoints.down('md'));
  const { data: swaps } = useAllSwaps({ limit: 600 });
  const { data: crown } = useCurrentCrown();
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const series = useMemo(() => {
    const build = (dir: Direction) => {
      const { clean } = tukeyClean(completedPoints(swaps, dir));
      const rates = clean.map((p) => p.rate);
      return {
        clean,
        ema: ema(rates, EMA_PERIOD),
        rates,
        vol: volumeByBlock(clean),
      };
    };
    return { 'BTC-TAO': build('BTC-TAO'), 'TAO-BTC': build('TAO-BTC') };
  }, [swaps]);

  const hasData =
    series['BTC-TAO'].clean.length + series['TAO-BTC'].clean.length > 0;

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

    const btc = theme.palette.asset.btc;
    const tao = theme.palette.primary.main;
    const axisColor = theme.palette.text.secondary;
    const gridColor = theme.palette.divider;

    const crownBtc = crown?.['BTC-TAO']?.rate ?? null;
    const crownTao = crown?.['TAO-BTC']?.rate ?? null;

    const b = series['BTC-TAO'];
    const t = series['TAO-BTC'];

    // One shared price range covering both directions so the gap between the two
    // lines reads as the true spread, not an artifact of independent scaling.
    const yRange = robustYRange([...b.rates, ...t.rates], {
      soft: [...b.ema, ...t.ema],
      hard: [crownBtc, crownTao].filter((v): v is number => v != null),
    });

    // Adaptive precision — a tight band needs decimals or every tick collapses
    // to the same rounded value.
    const ySpan = yRange ? yRange.max - yRange.min : 0;
    const yDecimals = ySpan >= 10 ? 0 : ySpan >= 1 ? 1 : 2;

    // Shared block x-range across both directions so the two series line up.
    const blocks = [...b.clean, ...t.clean].map((p) => p.block);
    const xMin = blocks.length ? Math.min(...blocks) : undefined;
    const xMax = blocks.length ? Math.max(...blocks) : undefined;
    const xPad = xMin != null && xMax != null ? (xMax - xMin) * 0.02 || 1 : 0;
    const xBounds =
      xMin != null && xMax != null
        ? { min: xMin - xPad, max: xMax + xPad }
        : {};

    // Both directions trade in τ, so their per-block volume shares one axis.
    const maxVol = Math.max(
      0,
      ...b.vol.map((v) => v.vol),
      ...t.vol.map((v) => v.vol),
    );
    const fmtVol = (v: number) =>
      v >= 1000
        ? `${(v / 1000).toFixed(1)}k`
        : v >= 10
          ? v.toFixed(0)
          : v.toFixed(1);

    // Block-height x-axis label — shown on the volume grid when present, else on
    // the price grid.
    const blockAxisLabel = {
      color: axisColor,
      fontFamily: FONTS.mono,
      fontSize: 9,
      formatter: (v: number) => `${(v / 1000).toFixed(1)}k`,
      hideOverlap: true,
    };

    const crownMarkLine = (rate: number | null, color: string) =>
      rate != null
        ? {
            silent: true,
            symbol: 'none',
            data: [{ yAxis: rate }],
            lineStyle: { color, type: 'dashed', width: 1, opacity: 0.7 },
            label: {
              position: 'insideStartTop',
              color,
              fontFamily: FONTS.mono,
              fontSize: 9,
              formatter: `crown ${rate.toFixed(2)}τ`,
            },
          }
        : undefined;

    chart.setOption(
      {
        animation: false,
        // Price grid on top, volume grid below (desktop). On mobile the volume
        // grid is dropped and price fills the height.
        grid: showVolume
          ? [
              { left: 48, right: 14, top: 8, height: '60%' },
              { left: 48, right: 14, top: '74%', bottom: 22 },
            ]
          : [{ left: 34, right: 8, top: 6, bottom: 18 }],
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
                return `${p.seriesName}: ${Number(v).toFixed(4)} τ`;
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
        yAxis: [
          {
            // Shared price axis — both directions read off this one scale, so
            // the gap between the lines is the spread.
            type: 'value',
            scale: true,
            gridIndex: 0,
            ...(yRange ? { min: yRange.min, max: yRange.max } : {}),
            axisLabel: {
              color: axisColor,
              fontFamily: FONTS.mono,
              fontSize: 9,
              formatter: (v: number) => v.toFixed(yDecimals),
            },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
          },
          // Volume axis (shared τ scale for both directions), on the lower grid.
          ...(showVolume
            ? [
                {
                  type: 'value',
                  gridIndex: 1,
                  min: 0,
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
                    lineStyle: {
                      color: gridColor,
                      type: 'dashed',
                      opacity: 0.4,
                    },
                  },
                },
              ]
            : []),
        ],
        series: [
          {
            name: 'BTC → TAO',
            type: 'scatter',
            yAxisIndex: 0,
            symbolSize: 5,
            z: 5,
            data: b.clean.map((p) => [p.block, p.rate]),
            itemStyle: { color: btc, opacity: 0.7 },
          },
          {
            // EMA shares the legend entry with its scatter via the same name.
            name: 'BTC → TAO',
            type: 'line',
            yAxisIndex: 0,
            smooth: true,
            smoothMonotone: 'x',
            showSymbol: false,
            data: b.clean.map((p, i) => [p.block, b.ema[i]]),
            lineStyle: { color: btc, width: 2 },
            z: 3,
            markLine: crownMarkLine(crownBtc, btc),
          },
          {
            name: 'TAO → BTC',
            type: 'scatter',
            yAxisIndex: 0,
            symbolSize: 5,
            z: 5,
            data: t.clean.map((p) => [p.block, p.rate]),
            itemStyle: { color: tao, opacity: 0.7 },
          },
          {
            name: 'TAO → BTC',
            type: 'line',
            yAxisIndex: 0,
            smooth: true,
            smoothMonotone: 'x',
            showSymbol: false,
            data: t.clean.map((p, i) => [p.block, t.ema[i]]),
            lineStyle: { color: tao, width: 2 },
            z: 3,
            markLine: crownMarkLine(crownTao, tao),
          },
          ...(showVolume
            ? [
                {
                  name: 'BTC → TAO',
                  type: 'bar',
                  xAxisIndex: 1,
                  yAxisIndex: 1,
                  data: b.vol.map((v) => [v.block, v.vol]),
                  itemStyle: { color: btc, opacity: 0.3 },
                  barWidth: 5,
                  barGap: '-100%',
                },
                {
                  name: 'TAO → BTC',
                  type: 'bar',
                  xAxisIndex: 1,
                  yAxisIndex: 1,
                  data: t.vol.map((v) => [v.block, v.vol]),
                  itemStyle: { color: tao, opacity: 0.3 },
                  barWidth: 5,
                  barGap: '-100%',
                },
              ]
            : []),
        ],
      },
      true,
    );
  }, [series, theme, crown, showVolume]);

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
          {hasData
            ? `${series['BTC-TAO'].clean.length}+${series['TAO-BTC'].clean.length} swaps · EMA${EMA_PERIOD}`
            : ''}
        </Typography>
      </Box>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          ...(fill ? { flex: 1, minHeight: 120 } : { height: 150 }),
        }}
      >
        <Box ref={elRef} sx={{ width: '100%', height: '100%' }} />
        {!hasData && (
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

export default CombinedMarketRateChart;
