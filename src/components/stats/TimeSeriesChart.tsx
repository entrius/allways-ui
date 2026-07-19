import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Box, Skeleton, useTheme } from '@mui/material';
import { FONTS } from '../../theme';

echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
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
  /** 'line' (default, with gradient area), 'bar', or 'scatter' (discrete
   * event prints, e.g. executed trades over a price line). */
  type?: 'line' | 'bar' | 'scatter';
  /** Override the per-series value formatter used in the tooltip. */
  formatValue?: (v: number) => string;
  /** Unit suffix shown after the value in the tooltip (e.g. 'τ', '%'). */
  unit?: string;
  /** Render the line dashed (reference/comparison series). */
  dashed?: boolean;
  /**
   * Step line: each value holds flat until the next point (carried-forward
   * ledgers like the crown rate). Overrides smoothing — interpolating between
   * step samples would invent moves that never happened.
   */
  step?: boolean;
  /** Supporting overlay (trade prints etc.): excluded from the legend and
   * from the single-series area-fill decision. */
  overlay?: boolean;
};

type TimeSeriesChartProps = {
  series: ChartSeries[];
  loading?: boolean;
  /** Fixed px height, or '100%' to fill a sized parent. */
  height?: number | string;
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
  /**
   * When true, y-axis ticks step by whole numbers — for count series where
   * fractional gridlines would round to duplicate labels (1, 1, 2, 2…).
   */
  integerY?: boolean;
  /**
   * When true, points are daily UTC buckets: the x-axis becomes a category
   * axis (one slot per day, so each column sits centered under its own date
   * label), dates are formatted in UTC (a bucket stamped 00:00Z must not
   * display as the previous local day), and today's still-filling bucket is
   * rendered faded/dashed with an "in progress" tooltip note.
   */
  daily?: boolean;
  /**
   * Volume bars along the chart's bottom quarter (tradingview-style), on a
   * hidden secondary axis so their scale never distorts the price axis.
   * Time-axis charts only (ignored in daily mode).
   */
  volume?: SeriesPoint[];
  /** Tooltip formatter for the volume bars (default: 2dp). */
  volumeFormat?: (v: number) => string;
  /**
   * Market-chart styling (tradingview conventions): price scale on the
   * right, free crosshair with axis-pinned labels, a last-price tag on the
   * axis, solid faint gridlines, and a compact label/value tooltip.
   */
  market?: boolean;
};

// Series name for the volume overlay — used to route tooltip formatting.
const VOLUME_NAME = 'Volume';
// Internal last-price tag series; hidden from the tooltip.
const LAST_TAG_NAME = '__last';

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

// Market crosshair/tooltip time: clock time on intraday windows, date + time
// on longer ones (never the ambiguous 2-digit year).
const fmtMarketTime = (ms: number, hourly: boolean) =>
  hourly
    ? new Date(ms).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date(ms).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

const fmtDateUtc = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

const utcMidnightToday = () => {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};

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
  daily,
  integerY,
  volume,
  volumeFormat,
  market,
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
    const primary = series.filter((s) => !s.overlay);
    const single = primary.length === 1;
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
    const hourly =
      !daily && span.hi > span.lo && span.hi - span.lo <= HOURLY_SPAN_MS;

    // Daily mode: one category slot per UTC-day bucket, shared across series
    // so multi-series charts stay index-aligned. The current UTC day (if
    // present) is still accumulating — style it as in-progress.
    const bucketTs = daily
      ? [...new Set(series.flatMap((s) => s.points.map((p) => p.t)))].sort(
          (a, b) => a - b,
        )
      : [];
    const inProgressT =
      daily && bucketTs[bucketTs.length - 1] === utcMidnightToday()
        ? bucketTs[bucketTs.length - 1]
        : null;
    const hasBars = series.some((s) => s.type === 'bar');

    // Volume overlay: bars pinned to the bottom ~quarter by giving the hidden
    // secondary axis 4x the max volume as its ceiling.
    const vol = !daily && volume?.length ? volume : null;
    const volMax = vol
      ? vol.reduce((m, p) => (p.value != null && p.value > m ? p.value : m), 0)
      : 0;

    const echartsSeries = series.map((s) => {
      const byT = daily ? new Map(s.points.map((p) => [p.t, p.value])) : null;
      if ((s.type ?? 'line') === 'bar') {
        const data = daily
          ? bucketTs.map((t) => {
              const v = byT!.get(t) ?? null;
              // Today's bar is faded with a dashed outline: visibly "still
              // filling", not a real drop-off.
              return t === inProgressT
                ? {
                    value: v,
                    itemStyle: {
                      color: s.color,
                      opacity: 0.3,
                      borderColor: s.color,
                      borderType: 'dashed' as const,
                      borderWidth: 1,
                    },
                  }
                : v;
            })
          : s.points.map((p) => [p.t, p.value]);
        return {
          name: s.name,
          type: 'bar' as const,
          data,
          itemStyle: { color: s.color, opacity: 0.75 },
          barMaxWidth: 24,
        };
      }
      if (s.type === 'scatter') {
        return {
          name: s.name,
          type: 'scatter' as const,
          data: s.points.map((p) => [p.t, p.value]),
          symbolSize: 5,
          itemStyle: { color: s.color, opacity: 0.6 },
        };
      }
      const data = daily
        ? bucketTs.map((t) => byT!.get(t) ?? null)
        : s.points.map((p) => [p.t, p.value]);
      return {
        name: s.name,
        type: 'line' as const,
        data,
        ...(s.step
          ? { step: 'end' as const }
          : { smooth: true, smoothMonotone: 'x' as const }),
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

    // tradingview-style last-price tag: a zero-size point at the newest value
    // whose label renders as a chip against the price scale. (markLine labels
    // clip at the grid edge; a scatter label with clip:false does not.)
    const lastTagSeries = [] as object[];
    if (market) {
      const prim = primary[0];
      const lastPt = prim
        ? [...prim.points].reverse().find((p) => p.value != null)
        : null;
      if (prim && lastPt && lastPt.value != null) {
        const fmtLast = prim.formatValue ?? formatValue ?? defaultFmt;
        lastTagSeries.push({
          name: LAST_TAG_NAME,
          type: 'scatter' as const,
          data: [[lastPt.t, lastPt.value]],
          symbolSize: 0.1,
          clip: false,
          silent: true,
          label: {
            show: true,
            position: 'right' as const,
            distance: 6,
            formatter: fmtLast(lastPt.value),
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: theme.palette.background.paper,
            backgroundColor: theme.palette.text.primary,
            padding: [3, 5, 2, 5],
          },
        });
      }
    }

    const volumeSeries = vol
      ? [
          {
            name: VOLUME_NAME,
            type: 'bar' as const,
            yAxisIndex: 1,
            data: vol.map((p) => [p.t, p.value]),
            itemStyle: { color: axisColor, opacity: 0.4 },
            // Histogram read: bars nearly fill their bucket's band instead of
            // rendering as thin ticks.
            barMaxWidth: '80%',
            barCategoryGap: '10%',
          },
        ]
      : [];

    chart.setOption(
      {
        animation: false,
        grid: market
          ? { left: 8, right: 64, top: 12, bottom: 28 }
          : { left: 56, right: 16, top: 16, bottom: 28 },
        legend: single
          ? undefined
          : {
              show: true,
              data: primary.map((s) => s.name),
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
          axisPointer:
            daily && hasBars
              ? { type: 'shadow' as const }
              : market
                ? {
                    // Free crosshair with axis-pinned value labels.
                    type: 'cross' as const,
                    crossStyle: {
                      color: axisColor,
                      width: 1,
                      type: 'dashed' as const,
                    },
                    label: {
                      show: true,
                      fontFamily: FONTS.mono,
                      fontSize: 10,
                      color: theme.palette.background.paper,
                      backgroundColor: theme.palette.text.primary,
                      padding: [3, 5, 2, 5],
                      formatter: (p: {
                        axisDimension: string;
                        value: number;
                      }) =>
                        p.axisDimension === 'y'
                          ? (formatValue ?? defaultFmt)(Number(p.value))
                          : fmtMarketTime(Number(p.value), hourly),
                    },
                  }
                : {
                    type: 'line' as const,
                    lineStyle: { color: gridColor },
                  },
          formatter: (
            params: {
              axisValue: number | string;
              seriesName: string;
              value: [number, number | null] | number | null;
              marker?: string;
              dataIndex?: number;
            }[],
          ) => {
            if (!params.length) return '';
            const t = Number(params[0].axisValue);
            const when = daily
              ? fmtDateUtc(t) + (t === inProgressT ? ' · in progress' : '')
              : market
                ? fmtMarketTime(t, hourly)
                : fmtTime(t, hourly);
            const header = `<span style="color:${theme.palette.text.disabled}">${when}</span>`;

            if (market) {
              // tradingview data window: one complete readout per hover —
              // the price level in effect at t, its change, and the volume
              // of the bin containing t — regardless of which series the
              // axis snapped to.
              const rows: string[] = [];
              const prim = series.find((x) => !x.overlay);
              if (prim) {
                const fmt = prim.formatValue ?? formatValue ?? defaultFmt;
                const unit = prim.unit ? ` ${prim.unit}` : '';
                let idx = -1;
                for (let i = 0; i < prim.points.length; i++) {
                  const pt = prim.points[i];
                  if (pt.t <= t && pt.value != null) idx = i;
                  if (pt.t > t) break;
                }
                if (idx >= 0) {
                  const cur = prim.points[idx].value as number;
                  rows.push(
                    `<span style="color:${axisColor}">Price</span> <b>${fmt(cur)}${unit}</b>`,
                  );
                  const prev = idx > 0 ? prim.points[idx - 1].value : null;
                  if (prev != null && prev !== 0) {
                    const chg = ((cur - prev) / prev) * 100;
                    rows.push(
                      `<span style="color:${axisColor}">Chg</span> <b>${
                        chg > 0 ? '+' : ''
                      }${chg.toFixed(2)}%</b>`,
                    );
                  }
                }
              }
              if (vol && vol.length) {
                const bucketMs =
                  vol.length > 1 ? vol[1].t - vol[0].t : Infinity;
                const bin = vol.find((p) => Math.abs(p.t - t) <= bucketMs / 2);
                const vfmt = volumeFormat ?? ((v: number) => v.toFixed(2));
                rows.push(
                  `<span style="color:${axisColor}">Vol</span> <b>${vfmt(bin?.value ?? 0)}</b>`,
                );
              }
              for (const pr of params) {
                const sObj = series.find((x) => x.name === pr.seriesName);
                if (!sObj?.overlay) continue;
                const raw = Array.isArray(pr.value) ? pr.value[1] : pr.value;
                if (raw == null) continue;
                const fmt = sObj.formatValue ?? formatValue ?? defaultFmt;
                const unit = sObj.unit ? ` ${sObj.unit}` : '';
                rows.push(
                  `<span style="color:${axisColor}">Exec</span> <b>${fmt(Number(raw))}${unit}</b>`,
                );
              }
              return `${header}<br/>${rows.join('<br/>')}`;
            }
            const lines = params
              .map((p) => {
                const raw = Array.isArray(p.value) ? p.value[1] : p.value;
                if (raw == null || p.seriesName === LAST_TAG_NAME) return '';
                if (p.seriesName === VOLUME_NAME) {
                  const vfmt = volumeFormat ?? ((v: number) => v.toFixed(2));
                  return `<span style="color:${axisColor}">Vol</span> ${vfmt(
                    Number(raw),
                  )}`;
                }
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
        xAxis: daily
          ? {
              // Category axis: each day owns a slot, so its label sits
              // centered directly under its own column instead of at
              // arbitrary "nice" time ticks.
              type: 'category' as const,
              data: bucketTs.map(String),
              axisLine: { lineStyle: { color: gridColor } },
              axisTick: { show: false },
              axisLabel: {
                color: axisColor,
                fontFamily: FONTS.mono,
                fontSize: 10,
                hideOverlap: true,
                // Label every day while they fit; fall back to auto-thinning
                // (still bucket-aligned) on long histories.
                interval: bucketTs.length <= 14 ? 0 : ('auto' as const),
                formatter: (v: string) => fmtDateUtc(Number(v)),
              },
              splitLine: { show: false },
            }
          : {
              type: 'time' as const,
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
        yAxis: [
          {
            position: market ? ('right' as const) : ('left' as const),
            // Log scale can't include 0, so drop the min:0 floor when enabled.
            type: logScale ? 'log' : 'value',
            ...(logScale ? {} : autoScale ? { scale: true } : { min: 0 }),
            ...(integerY && !logScale && { minInterval: 1 }),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: axisColor,
              fontFamily: FONTS.mono,
              fontSize: 10,
              formatter: (v: number) => (formatValue ?? defaultFmt)(v),
            },
            splitLine: {
              lineStyle: {
                color: gridColor,
                type: market ? ('solid' as const) : ('dashed' as const),
              },
            },
          },
          ...(vol
            ? [
                {
                  type: 'value' as const,
                  show: false,
                  min: 0,
                  max: volMax * 4 || 1,
                  // No crosshair label for the hidden volume scale — only the
                  // price axis carries the y readout.
                  axisPointer: { show: false },
                },
              ]
            : []),
        ],
        series: [...echartsSeries, ...volumeSeries, ...lastTagSeries],
      },
      true,
    );
  }, [
    series,
    theme,
    formatValue,
    noArea,
    logScale,
    autoScale,
    daily,
    integerY,
    volume,
    volumeFormat,
    market,
  ]);

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
