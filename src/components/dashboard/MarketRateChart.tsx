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

const MarketRateChart: React.FC<{ direction: Direction; fill?: boolean }> = ({
  direction,
  fill,
}) => {
  const theme = useTheme();
  // Drop the volume sub-chart on small/stacked screens — too cramped on mobile.
  const showVolume = !useMediaQuery(theme.breakpoints.down('md'));
  const { data: swaps } = useAllSwaps({ limit: 600 });
  const { data: crown } = useCurrentCrown();
  const crownRate = crown?.[direction]?.rate ?? null;
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const points = useMemo(
    () => completedPoints(swaps, direction),
    [swaps, direction],
  );

  const { clean, hidden } = useMemo(() => tukeyClean(points), [points]);

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

    const accent =
      direction === 'BTC-TAO'
        ? theme.palette.asset.btc
        : theme.palette.primary.main;
    const axisColor = theme.palette.text.secondary;
    const gridColor = theme.palette.divider;
    const crownColor = theme.palette.text.secondary;

    const rates = clean.map((p) => p.rate);
    const emaValues = ema(rates, EMA_PERIOD);
    const yRange = robustYRange(rates);
    const vol = volumeByBlock(clean);

    // Shared block x-range so the price and volume grids line up exactly.
    const blocks = clean.map((p) => p.block);
    const xMin = blocks.length ? Math.min(...blocks) : undefined;
    const xMax = blocks.length ? Math.max(...blocks) : undefined;
    const xPad = xMin != null && xMax != null ? (xMax - xMin) * 0.02 || 1 : 0;
    const xBounds =
      xMin != null && xMax != null
        ? { min: xMin - xPad, max: xMax + xPad }
        : {};

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
                axisLabel: {
                  color: axisColor,
                  fontFamily: FONTS.mono,
                  fontSize: 9,
                  formatter: (v: number) => v.toFixed(0),
                },
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
              },
              {
                type: 'value',
                gridIndex: 1,
                min: 0,
                axisLabel: { show: false },
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
              },
            ]
          : [
              {
                type: 'value',
                scale: true,
                gridIndex: 0,
                ...(yRange ? { min: yRange.min, max: yRange.max } : {}),
                axisLabel: {
                  color: axisColor,
                  fontFamily: FONTS.mono,
                  fontSize: 9,
                  formatter: (v: number) => v.toFixed(0),
                },
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
              },
            ],
        series: [
          {
            name: 'Rate',
            type: 'scatter',
            xAxisIndex: 0,
            yAxisIndex: 0,
            symbolSize: 5,
            // Render above the EMA line + area so every executed swap is
            // visible, not hidden under the fill.
            z: 5,
            data: clean.map((p) => [p.block, p.rate]),
            itemStyle: { color: accent, opacity: 0.7 },
          },
          {
            name: 'EMA',
            type: 'line',
            xAxisIndex: 0,
            yAxisIndex: 0,
            smooth: true,
            showSymbol: false,
            data: clean.map((p, i) => [p.block, emaValues[i]]),
            lineStyle: { color: accent, width: 2 },
            areaStyle: { color: accent, opacity: 0.07 },
            z: 3,
            // Dashed reference line at the live crown rate so the chart shows
            // where "now" sits versus the recent executed swaps.
            markLine:
              crownRate != null
                ? {
                    silent: true,
                    symbol: 'none',
                    data: [{ yAxis: crownRate }],
                    lineStyle: {
                      color: crownColor,
                      type: 'dashed',
                      width: 1,
                      opacity: 0.8,
                    },
                    label: {
                      position: 'insideStartTop',
                      color: crownColor,
                      fontFamily: FONTS.mono,
                      fontSize: 9,
                      formatter: `crown ${crownRate.toFixed(2)}τ`,
                    },
                  }
                : undefined,
          },
          ...(showVolume
            ? [
                {
                  name: 'Volume',
                  type: 'bar',
                  xAxisIndex: 1,
                  yAxisIndex: 1,
                  data: vol.map((b) => [b.block, b.vol]),
                  itemStyle: { color: accent, opacity: 0.32 },
                  barWidth: 5,
                },
              ]
            : []),
        ],
      },
      true,
    );
  }, [clean, direction, theme, crownRate, showVolume]);

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
          {clean.length
            ? `${clean.length} swaps${hidden ? ` · ${hidden} outlier${hidden > 1 ? 's' : ''} hidden` : ''} · EMA${EMA_PERIOD}`
            : ''}
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
        {clean.length === 0 && (
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
