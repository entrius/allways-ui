import React, { useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import { useCrownRateHistory, useCurrentCrown } from '../../api';
import {
  crownLaneFor,
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { chainSymbol, formatRate } from '../../utils/format';
import { FONTS } from '../../theme';
import { TimeSeriesChart, type ChartSeries } from '../stats';
import { type HeroRange, RANGE_SECS } from './AllwaysMarketRate';

// The selected direction's crown rate over the window, one step line on the
// matrix's ruler (quote per 1 of the hub column), so the chart's right edge
// is the number in the card and the cell you clicked. Rows are interval
// starts — the rate holds until the next row — so the series is extended to
// now with the LIVE crown rather than the last sample: recording can lag
// the live crown, and a stale flat extension would contradict the book.
const RateChart: React.FC<{
  direction: Direction;
  base: string;
  range: HeroRange;
  /** Fixed px height, or '100%' to fill a sized parent. */
  height?: number | string;
  /** The O / H / L / C readout above the line (the widget's setting). */
  readout?: boolean;
}> = ({ direction, base, range, height = 220, readout = true }) => {
  const theme = useTheme();
  const secs = RANGE_SECS[range];
  const legs = decomposeDirection(direction);
  const quote = legs.from === base ? legs.to : legs.from;
  const inverted = legs.from !== base;
  const toPrice = (natural: number | null): number | null =>
    natural == null || !Number.isFinite(natural)
      ? null
      : inverted
        ? natural > 0
          ? 1 / natural
          : null
        : natural;

  // The lane scored on the base hub — the one the matrix column shows.
  const { data: rows, isLoading } = useCrownRateHistory({
    direction,
    secs,
    backing: base,
  });
  const { data: crown } = useCurrentCrown();
  const live = toPrice(
    directionalRateFor(direction, crownLaneFor(crown, direction, base)?.rate),
  );

  const points = useMemo(() => {
    const pts = (rows ?? [])
      .map((r) => ({
        t: r.t * 1000,
        value: toPrice(directionalRateFor(direction, r.rate)),
      }))
      .filter((p): p is { t: number; value: number } => p.value != null);
    const tip = live ?? (pts.length ? pts[pts.length - 1].value : null);
    if (tip != null) pts.push({ t: Date.now(), value: tip });
    return pts;
    // toPrice is derived from `inverted`, listed instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, live, direction, inverted]);

  // One instrument, one line — the house monochrome (a hex value, which the
  // chart's gradient alpha-suffix requires).
  const cLine = theme.palette.text.primary;
  const series = useMemo<ChartSeries[]>(
    () => [
      {
        name: `${chainSymbol(quote)} per ${chainSymbol(base)}`,
        color: cLine,
        formatValue: formatRate,
        unit: chainSymbol(quote),
        step: true,
        points,
      },
    ],
    [quote, base, cLine, points],
  );

  // The window's quote-bar summary a terminal opens with. These are the
  // extremes of the crown SERIES, not candles: Allways has no fixed bar
  // interval, the crown simply moves when a better quote lands, so O and C
  // are the window's first and last accepted rates and H/L its bounds.
  const ohlc = useMemo(() => {
    const vals = points.map((pt) => pt.value);
    if (!vals.length) return null;
    const open = vals[0];
    const close = vals[vals.length - 1];
    return {
      open,
      high: Math.max(...vals),
      low: Math.min(...vals),
      close,
      change: close - open,
      pct: open !== 0 ? ((close - open) / open) * 100 : null,
    };
  }, [points]);

  return (
    <Box
      sx={{
        height,
        minWidth: 0,
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* No move colour on this row: it is a readout, not a signal. The
          chart underneath carries the direction. */}
      {readout && ohlc && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            columnGap: 1,
            rowGap: 0.25,
            px: 1,
            pb: 0.5,
            flexShrink: 0,
            fontFamily: FONTS.mono,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {(
            [
              ['O', ohlc.open],
              ['H', ohlc.high],
              ['L', ohlc.low],
              ['C', ohlc.close],
            ] as const
          ).map(([letter, value]) => (
            <Box
              key={letter}
              component="span"
              sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.4 }}
            >
              <Box
                component="span"
                sx={{ fontSize: '0.62rem', color: 'text.disabled' }}
              >
                {letter}
              </Box>
              <Box
                component="span"
                sx={{ fontSize: '0.72rem', fontWeight: 600 }}
              >
                {formatRate(value)}
              </Box>
            </Box>
          ))}
          <Box component="span" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
            {ohlc.change > 0 ? '+' : ''}
            {formatRate(ohlc.change)}
            {ohlc.pct != null &&
              ` (${ohlc.pct > 0 ? '+' : ''}${ohlc.pct.toFixed(2)}%)`}
          </Box>
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <TimeSeriesChart
          series={series}
          loading={isLoading}
          height="100%"
          formatValue={formatRate}
          autoScale
          noArea
          market
          hideLegend
          emptyLabel="no rate history in this window"
        />
      </Box>
    </Box>
  );
};

export default RateChart;
