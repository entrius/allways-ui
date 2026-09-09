import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Box, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { FONTS } from '../../theme';

echarts.use([
  LineChart,
  GridComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export type DepthHover = { side: 'left' | 'right'; index: number } | null;

export type DepthLevel = {
  /** Rate, in the book's one unit. */
  price: number;
  /** Cumulative depth from the best level down to this one, in the row asset. */
  total: number;
  /** Tooltip body for this level, one line per entry: [label, value]. */
  lines: [string, string][];
};

export type DepthSpread = {
  /** The two best levels: the left side's and the right side's. */
  a: number;
  b: number;
  /** Whether the sides overlap (the right side's best is under the left's). */
  crossed: boolean;
  /** Tint for the band; null for the neutral gap. */
  color?: string | null;
};

type DepthSide = {
  /** Direction label, e.g. "TAO → USDC". */
  name: string;
  /** The side's colour: the exchange green/red the eye already knows. */
  color: string;
  /** Levels from the best outward (the order the ladder prints). */
  levels: DepthLevel[];
};

/**
 * The book as a depth chart: cumulative size against rate, one side
 * stepping left from its best level and the other stepping right, meeting
 * (or overlapping, when crossed) in the middle, in the two colours every
 * exchange's depth chart uses, so the shape reads at a glance. The picked
 * side is drawn a touch heavier. The spread is the gap between them,
 * drawn as a captioned band; a crossed book's overlap is the same band,
 * darker, where the two sides run over each other.
 */
const DepthChart: React.FC<{
  left: DepthSide;
  right: DepthSide;
  selected: 'left' | 'right';
  spread?: DepthSpread | null;
  formatPrice: (v: number) => string;
  formatTotal: (v: number) => string;
  height: number;
  /** The level under the pointer, as the chart sees it; null on leave. */
  onHover?: (hover: DepthHover) => void;
  /** A level to point at from outside (the ladder's hovered row). */
  hover?: DepthHover;
}> = ({
  left,
  right,
  selected,
  spread,
  formatPrice,
  formatTotal,
  height,
  onHover,
  hover,
}) => {
  const theme = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  // The level the chart itself last reported, so the parent echoing it
  // back as an outside hover does not re-fire the tooltip in a loop.
  const reported = useRef<DepthHover>(null);

  // Series data index -> level index. The left series is drawn ascending
  // (levels reversed) with an edge point prepended; the right has its edge
  // appended. Both maps are their own inverse.
  const toLevelIndex = (side: 'left' | 'right', dataIndex: number) =>
    side === 'left'
      ? Math.max(0, left.levels.length - dataIndex)
      : Math.min(right.levels.length - 1, dataIndex);
  const toDataIndex = (side: 'left' | 'right', levelIndex: number) =>
    side === 'left' ? left.levels.length - levelIndex : levelIndex;

  useEffect(() => {
    if (!ref.current) return;
    const chart = chartRef.current ?? echarts.init(ref.current, undefined);
    chartRef.current = chart;

    const ink = theme.palette.text.primary;
    const axisColor = theme.palette.text.secondary;
    const gridColor = theme.palette.divider;
    const toneFor = (side: DepthSide, picked: boolean) => ({
      line: side.color,
      fill: alpha(side.color, picked ? 0.22 : 0.14),
      width: picked ? 2 : 1.5,
      picked,
    });

    // Points carry the level so the tooltip can print it.
    const toPoints = (side: DepthSide) =>
      side.levels.map((l) => ({ value: [l.price, l.total], level: l }));
    const leftTone = toneFor(left, selected === 'left');
    const rightTone = toneFor(right, selected === 'right');
    const leftPts = toPoints(left).reverse(); // ascending x
    const rightPts = toPoints(right);
    const xs = [...left.levels, ...right.levels].map((l) => l.price);
    const lo = xs.length ? Math.min(...xs) : 0;
    const hi = xs.length ? Math.max(...xs) : 1;
    const pad = (hi - lo || hi || 1) * 0.08;
    // Extend each side's last step to the plot edge, flat at its full depth.
    const leftEdge =
      leftPts.length && left.levels.length
        ? [
            {
              value: [lo - pad, left.levels[left.levels.length - 1].total],
              level: left.levels[left.levels.length - 1],
            },
          ]
        : [];
    const rightEdge =
      rightPts.length && right.levels.length
        ? [
            {
              value: [hi + pad, right.levels[right.levels.length - 1].total],
              level: right.levels[right.levels.length - 1],
            },
          ]
        : [];

    const series = (
      name: string,
      data: { value: number[]; level: DepthLevel }[],
      step: 'start' | 'end',
      tone: ReturnType<typeof toneFor>,
    ) => ({
      name,
      type: 'line' as const,
      step,
      data,
      symbol: 'none',
      lineStyle: { color: tone.line, width: tone.width },
      areaStyle: { color: tone.fill },
      emphasis: { disabled: true },
      z: tone.picked ? 3 : 2,
    });

    // The gap (or overlap) between the two best levels, captioned.
    // A spread is a gap, drawn as a solid tint. A crossed book is the
    // opposite, an overlap, drawn the way overlaps always are: hatched,
    // like the intersection of two circles.
    const GRID_TOP = 22;
    // Diagonal hatching as a repeating canvas tile, the fill for an overlap.
    const hatch = (color: string) => {
      const tile = document.createElement('canvas');
      const size = 8;
      tile.width = size;
      tile.height = size;
      const ctx = tile.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, size);
        ctx.lineTo(size, 0);
        ctx.moveTo(-size / 2, size / 2);
        ctx.lineTo(size / 2, -size / 2);
        ctx.moveTo(size / 2, size * 1.5);
        ctx.lineTo(size * 1.5, size / 2);
        ctx.stroke();
      }
      return { image: tile, repeat: 'repeat' as const };
    };
    const band = spread
      ? {
          silent: true,
          z: 4,
          itemStyle: spread.crossed
            ? { color: hatch(alpha(ink, 0.35)) }
            : {
                color: spread.color
                  ? alpha(spread.color, 0.14)
                  : alpha(ink, 0.04),
              },
          // The caption is printed by the parent above the plot.
          label: { show: false },
          data: [
            [
              { xAxis: Math.min(spread.a, spread.b) },
              { xAxis: Math.max(spread.a, spread.b) },
            ],
          ],
        }
      : undefined;

    // Each side's best rate, pinned to the plot as a rule in the side's
    // colour with the rate on a tag at the top. On a normal book the green
    // tag sits left of the red; crossed, they have swapped sides, which is
    // the whole story at a glance.
    // The tag hangs outward from its rule — the lower rate's to the left,
    // the higher rate's to the right — so two close rates never overlap.
    const bestMark = (x: number, color: string, hang: 'left' | 'right') => ({
      xAxis: x,
      lineStyle: { color, type: 'solid' as const, width: 1 },
      label: {
        show: true,
        position: 'end' as const,
        align: hang === 'left' ? ('right' as const) : ('left' as const),
        formatter: formatPrice(x),
        color: theme.palette.getContrastText(color),
        backgroundColor: color,
        fontFamily: FONTS.mono,
        fontSize: 10,
        fontWeight: 700 as const,
        padding: [2, 5, 1, 5],
        distance: 2,
      },
    });
    // Each mark rides its own side's series: a mark past the end of the
    // series it belongs to gets pulled back to that series' last point.
    const bestOf = (x: number, color: string, hang: 'left' | 'right') => ({
      silent: true,
      symbol: 'none',
      z: 5,
      animation: false,
      // echarts rounds a markLine's axis value to `precision` decimals
      // (default 2), which would put a 0.34003 and a 0.34058 on one line.
      precision: 12,
      data: [bestMark(x, color, hang)],
    });
    const leftBest = spread
      ? bestOf(spread.a, left.color, spread.a <= spread.b ? 'left' : 'right')
      : undefined;
    const rightBest = spread
      ? bestOf(spread.b, right.color, spread.b < spread.a ? 'left' : 'right')
      : undefined;

    chart.setOption(
      {
        animation: false,
        // Room above the plot for the best-rate tags.
        grid: { left: 48, right: 12, top: GRID_TOP, bottom: 24 },
        xAxis: {
          type: 'value',
          min: lo - pad,
          max: hi + pad,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: axisColor,
            fontFamily: FONTS.mono,
            fontSize: 10,
            formatter: (v: number) => formatPrice(v),
            hideOverlap: true,
            // The edges are padding, not levels.
            showMinLabel: false,
            showMaxLabel: false,
          },
        },
        yAxis: {
          type: 'value',
          min: 0,
          splitNumber: 3,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: gridColor } },
          axisLabel: {
            color: axisColor,
            fontFamily: FONTS.mono,
            fontSize: 10,
            formatter: (v: number) => formatTotal(v),
          },
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.border.medium,
          borderWidth: 1,
          padding: [6, 10],
          extraCssText: 'pointer-events:none;',
          textStyle: {
            color: theme.palette.text.primary,
            fontFamily: FONTS.mono,
            fontSize: 11,
          },
          axisPointer: {
            type: 'line',
            lineStyle: { color: axisColor, type: 'dashed' },
          },
          formatter: (
            params:
              | {
                  seriesName: string;
                  seriesIndex: number;
                  dataIndex: number;
                  data: { level: DepthLevel };
                }[]
              | {
                  seriesName: string;
                  seriesIndex: number;
                  dataIndex: number;
                  data: { level: DepthLevel };
                },
          ) => {
            const list = Array.isArray(params) ? params : [params];
            const p = list.find((x) => x?.data?.level);
            if (!p) return '';
            const l = p.data.level;
            const side = p.seriesIndex === 0 ? 'left' : 'right';
            reported.current = { side, index: toLevelIndex(side, p.dataIndex) };
            onHoverRef.current?.(reported.current);
            const rows = l.lines
              .map(
                ([k, v]) =>
                  `<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:${axisColor}">${k}</span><span>${v}</span></div>`,
              )
              .join('');
            return `<div style="font-weight:700;margin-bottom:4px">${p.seriesName} · down to ${formatPrice(l.price)}</div>${rows}`;
          },
        },
        series: [
          {
            ...series(left.name, [...leftEdge, ...leftPts], 'start', leftTone),
            markArea: band,
            markLine: leftBest,
          },
          {
            ...series(
              right.name,
              [...rightPts, ...rightEdge],
              'end',
              rightTone,
            ),
            markLine: rightBest,
          },
        ],
      },
      true,
    );
    // toLevelIndex only reads left/right, which are listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, right, selected, spread, formatPrice, formatTotal, theme]);

  // Pointer leaving the plot clears the hover.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const leave = () => {
      reported.current = null;
      onHoverRef.current?.(null);
    };
    chart.on('globalout', leave);
    return () => {
      chart.off('globalout', leave);
    };
  }, []);

  // A hover from outside (the ladder) points the chart's tooltip at that
  // level; one the chart itself reported is left alone.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const r = reported.current;
    if (hover && r && hover.side === r.side && hover.index === r.index) return;
    if (!hover) {
      reported.current = null;
      chart.dispatchAction({ type: 'hideTip' });
      return;
    }
    chart.dispatchAction({
      type: 'showTip',
      seriesIndex: hover.side === 'left' ? 0 : 1,
      dataIndex: toDataIndex(hover.side, hover.index),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => chartRef.current?.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return <Box ref={ref} sx={{ width: '100%', height }} />;
};

export default DepthChart;
