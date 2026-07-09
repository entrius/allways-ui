import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Box, Skeleton, useTheme } from '@mui/material';
import { FONTS } from '../../theme';

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export type SeriesPoint = {
  /** Epoch ms. */
  t: number;
  /** Level/value for this bucket. `null` renders a gap (line) or no bar. */
  value: number | null;
};

export type ChartSeries = {
  name: string;
  points: SeriesPoint[];
  color: string;
  /** 'line' (default, with gradient area) or 'bar'. */
  type?: 'line' | 'bar';
  /** Override the per-series value formatter used in the tooltip. */
  formatValue?: (v: number) => string;
  /** Unit suffix shown after the value in the tooltip (e.g. 'τ', '%'). */
  unit?: string;
  /** Render the line dashed (reference/comparison series). */
  dashed?: boolean;
};

type TimeSeriesChartProps = {
  series: ChartSeries[];
  loading?: boolean;
  height?: number;
  /** Default value formatter for the y-axis + tooltip (per-series wins). */
  formatValue?: (v: number) => string;
  /** When true, area fill under a single line series is dropped. */
  noArea?: boolean;
  /** When true, the y-axis uses a log scale (for wide-range / outlier data). */
  logScale?: boolean;
  /**
   * When true, the y-axis zooms to the data range instead of starting at 0 —
   * for level-style series (rates) where the shape matters more than the
   * distance from zero.
   */
  autoScale?: boolean;
  /** Message shown when every series is empty. */
  emptyLabel?: string;
};

// Spans at or under this render hour:minute labels; longer spans render dates.
const HOURLY_SPAN_MS = 3 * 24 * 3600 * 1000;

const fmtTime = (ms: number, hourly: boolean) =>
  hourly
    ? new Date(ms).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date(ms).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      });

const defaultFmt = (v: number) =>
  Math.abs(v) >= 1000
    ? v.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : v.toLocaleString(undefined, { maximumFractionDigits: 2 });

/**
 * Full-size time-series chart with visible axes, gridlines, axis labels and a
 * shared hover tooltip — the read-the-numbers counterpart to the minimal
 * landing KpiSparkline. Supports one or more line/bar series on a shared time
 * x-axis. Follows the same echarts init / ResizeObserver / setOption lifecycle
 * as MarketRateChart, and keeps the chart `<div>` always mounted (overlaying
 * loading/empty states) so the init effect always has a real node.
 */
const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  series,
  loading,
  height = 220,
  formatValue,
  noArea,
  logScale,
  autoScale,
  emptyLabel = 'no history yet',
}) => {
  const theme = useTheme();
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const totalPoints = useMemo(
    () => series.reduce((n, s) => n + s.points.length, 0),
    [series],
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

    const axisColor = theme.palette.text.secondary;
    const gridColor = theme.palette.divider;
    const single = series.length === 1;
    const useArea = single && !noArea;

    // Short windows (intraday rate charts) label the x-axis with clock time;
    // long histories with dates. Reduce instead of Math.max(...arr) — rate
    // series can hold thousands of points and spreading them risks the stack.
    const span = series.reduce(
      (acc, s) =>
        s.points.reduce(
          (a, p) => ({
            lo: p.t < a.lo ? p.t : a.lo,
            hi: p.t > a.hi ? p.t : a.hi,
          }),
          acc,
        ),
      { lo: Infinity, hi: -Infinity },
    );
    const hourly = span.hi > span.lo && span.hi - span.lo <= HOURLY_SPAN_MS;

    const echartsSeries = series.map((s) => {
      const data = s.points.map((p) => [p.t, p.value]);
      if ((s.type ?? 'line') === 'bar') {
        return {
          name: s.name,
          type: 'bar' as const,
          data,
          itemStyle: { color: s.color, opacity: 0.75 },
          barMaxWidth: 24,
        };
      }
      return {
        name: s.name,
        type: 'line' as const,
        data,
        smooth: true,
        smoothMonotone: 'x' as const,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 6,
        // Null buckets break the line into gaps rather than dropping to zero.
        connectNulls: false,
        lineStyle: {
          color: s.color,
          width: 2,
          ...(s.dashed && { type: [4, 3] as number[], width: 1.6 }),
        },
        itemStyle: { color: s.color },
        ...(useArea && {
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${s.color}33` },
              { offset: 1, color: `${s.color}00` },
            ]),
          },
        }),
        emphasis: { focus: 'series' as const },
      };
    });

    chart.setOption(
      {
        animation: false,
        grid: { left: 56, right: 16, top: 16, bottom: 28 },
        legend: single
          ? undefined
          : {
              show: true,
              top: 0,
              right: 8,
              textStyle: {
                color: axisColor,
                fontFamily: FONTS.mono,
                fontSize: 10,
              },
              itemWidth: 12,
              itemHeight: 8,
            },
        tooltip: {
          trigger: 'axis',
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.border.medium,
          borderWidth: 1,
          padding: [6, 10],
          textStyle: {
            color: theme.palette.text.primary,
            fontFamily: FONTS.mono,
            fontSize: 11,
          },
          axisPointer: { type: 'line', lineStyle: { color: gridColor } },
          formatter: (
            params: {
              axisValue: number;
              seriesName: string;
              value: [number, number | null];
              marker?: string;
            }[],
          ) => {
            if (!params.length) return '';
            const header = `<span style="color:${theme.palette.text.disabled}">${fmtTime(
              Number(params[0].axisValue),
              hourly,
            )}</span>`;
            const lines = params
              .map((p) => {
                const raw = Array.isArray(p.value) ? p.value[1] : p.value;
                if (raw == null) return '';
                const s = series.find((x) => x.name === p.seriesName);
                const fmt = s?.formatValue ?? formatValue ?? defaultFmt;
                const unit = s?.unit ? ` ${s.unit}` : '';
                return `${p.marker ?? ''}<b>${fmt(Number(raw))}${unit}</b>${
                  single
                    ? ''
                    : ` <span style="color:${axisColor}">${p.seriesName}</span>`
                }`;
              })
              .filter(Boolean)
              .join('<br/>');
            return `${header}<br/>${lines}`;
          },
        },
        xAxis: {
          type: 'time',
          boundaryGap: false,
          axisLine: { lineStyle: { color: gridColor } },
          axisTick: { show: false },
          axisLabel: {
            color: axisColor,
            fontFamily: FONTS.mono,
            fontSize: 10,
            hideOverlap: true,
            formatter: (v: number) =>
              hourly
                ? new Date(v).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : new Date(v).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  }),
          },
          splitLine: { show: false },
        },
        yAxis: {
          // Log scale can't include 0, so drop the min:0 floor when enabled.
          type: logScale ? 'log' : 'value',
          ...(logScale ? {} : autoScale ? { scale: true } : { min: 0 }),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: axisColor,
            fontFamily: FONTS.mono,
            fontSize: 10,
            formatter: (v: number) => (formatValue ?? defaultFmt)(v),
          },
          splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
        },
        series: echartsSeries,
      },
      true,
    );
  }, [series, theme, formatValue, noArea, logScale, autoScale]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <Box ref={elRef} sx={{ width: '100%', height: '100%' }} />
      {loading && (
        <Skeleton
          variant="rectangular"
          sx={{ position: 'absolute', inset: 0, bgcolor: 'action.hover' }}
        />
      )}
      {!loading && totalPoints === 0 && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONTS.mono,
            fontSize: '0.72rem',
            color: 'text.disabled',
          }}
        >
          {emptyLabel}
        </Box>
      )}
    </Box>
  );
};

export default TimeSeriesChart;
