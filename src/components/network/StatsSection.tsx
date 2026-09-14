import React, { useMemo } from 'react';
import { Box, Grid, Stack, Typography, useTheme } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { Panel, TimeSeriesChart, type ChartSeries } from '../stats';
import RangeChips from '../RangeChips';
import { useHistory, useUsdPrices, type HistoryRange } from '../../api';
import type { HistoryRow } from '../../api/models';
import { hubChains } from '../../api/models/chains';
import {
  formatUsd,
  lamportsToSol,
  usdFromBackingMap,
} from '../../utils/format';
import { FONTS } from '../../theme';

/**
 * The network's history, by day: how much moved, how many transactions, how
 * reliably and how fast they settled, and what the protocol earned. One
 * lookback (`7d`, `30d`, `all`) drives every chart, kept in the URL as
 * `statsRange` beside the tape's filters and the miners' ranges so a link
 * restores the whole page.
 *
 * Eight panels in the bordered panel style the miners section uses. What the
 * older stats page also carried is not repeated here: the direction mix is
 * the Emission by pair panel above, and the top-miners list is the
 * leaderboard.
 */

const RANGES = ['7d', '30d', 'all'] as const;
type StatsRange = (typeof RANGES)[number];
const isStatsRange = (v: string | null): v is StatsRange =>
  RANGES.includes(v as StatsRange);
const DEFAULT_RANGE: StatsRange = '30d';
export const STATS_RANGE_PARAM = 'statsRange';

// Short axis ticks: 1.2k, 340, 0.45.
const compact = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}m`
    : Math.abs(v) >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : v >= 10
        ? v.toFixed(0)
        : Number(v.toPrecision(2)).toString();

const usdCompact = (v: number) => `$${compact(v)}`;

const count = (v: number) => Math.round(v).toString();

const solAmount = (v: number) =>
  v >= 100
    ? v.toFixed(0)
    : v >= 1
      ? v.toFixed(2)
      : Number(v.toPrecision(3)).toString();

const secs = (v: number) => `${v.toFixed(v >= 10 ? 0 : 1)}s`;

const pctValue = (v: number) => `${v.toFixed(1)}%`;

const ms = (iso: string) => new Date(iso).getTime();

const points = (
  rows: HistoryRow[] | undefined,
  pick: (r: HistoryRow) => number | null,
) => (rows ?? []).map((r) => ({ t: ms(r.t), value: pick(r) }));

const StatsSection: React.FC = () => {
  const theme = useTheme();
  const ink = theme.palette.text.primary;
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
  const { data: history, isLoading } = useHistory(range as HistoryRange, 'day');

  const prices = useUsdPrices();
  // Volume and fees render as estimated USD (the one legitimate sum across
  // backings) whenever every hub has a price; otherwise the SOL-only figure,
  // which leaves TAO-backed flow out and says so in the subtitle.
  const usdMode = hubChains().every((h) => typeof prices[h] === 'number');
  const money = usdMode ? 'estimated USD' : 'SOL only';
  const moneyTick = usdMode ? usdCompact : compact;
  const moneyValue = usdMode ? formatUsd : solAmount;

  const volume = (r: HistoryRow) =>
    usdMode
      ? usdFromBackingMap(r.volumeByBacking, prices, r.volumeSol)
      : lamportsToSol(r.volumeSol);
  const cumulativeVolume = (r: HistoryRow) =>
    usdMode
      ? usdFromBackingMap(
          r.cumulativeVolumeByBacking,
          prices,
          r.cumulativeVolumeSol,
        )
      : lamportsToSol(r.cumulativeVolumeSol);
  const fees = (r: HistoryRow) =>
    usdMode
      ? usdFromBackingMap(r.feesByBacking, prices, r.feesSol)
      : lamportsToSol(r.feesSol);

  const series = useMemo(() => {
    const line = (
      name: string,
      pick: (r: HistoryRow) => number | null,
      extra: Partial<ChartSeries> = {},
    ): ChartSeries[] => [
      { name, color: ink, points: points(history, pick), ...extra },
    ];
    const bars = (
      name: string,
      pick: (r: HistoryRow) => number | null,
      extra: Partial<ChartSeries> = {},
    ): ChartSeries[] => line(name, pick, { type: 'bar', ...extra });

    return {
      volume: bars('Volume', volume, { formatValue: moneyValue }),
      transactions: bars('Transactions', (r) => r.swaps, {
        formatValue: count,
      }),
      cumulativeVolume: line('Cumulative volume', cumulativeVolume, {
        formatValue: moneyValue,
      }),
      cumulativeTransactions: line(
        'Cumulative transactions',
        (r) => r.cumulativeSwaps,
        { formatValue: count },
      ),
      successRate: line(
        'Success rate',
        (r) => (r.successRate == null ? null : r.successRate * 100),
        { formatValue: pctValue },
      ),
      settlement: [
        ...line('Median', (r) => r.medianSettlementSecs ?? null, {
          formatValue: secs,
        }),
        ...line('Average', (r) => r.avgSettlementSecs, {
          formatValue: secs,
          dashed: true,
        }),
      ],
      fees: bars('Fees', fees, { formatValue: moneyValue }),
      cumulativeFees: line(
        'Cumulative fees',
        // The API's cumulative fee column carries a seed offset on prod
        // (see Stats.ts); fees are a flat 1% of volume, so derive them.
        (r) => {
          const v = cumulativeVolume(r);
          return v == null ? null : v * 0.01;
        },
        { formatValue: moneyValue },
      ),
    };
    // The pickers close over usdMode and prices, which are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, ink, usdMode, prices]);

  const chart = (
    key: keyof typeof series,
    format: (v: number) => string,
    extra: Partial<React.ComponentProps<typeof TimeSeriesChart>> = {},
  ) => (
    <TimeSeriesChart
      daily
      series={series[key]}
      loading={isLoading}
      formatValue={format}
      emptyLabel="no completed transactions in this range"
      {...extra}
    />
  );

  const panels: {
    title: string;
    subtitle: string;
    info: string;
    body: React.ReactNode;
  }[] = [
    {
      title: 'Volume',
      subtitle: `per day · ${money}`,
      info: 'Completed swap volume each day, estimated in USD at current prices.',
      body: chart('volume', moneyTick),
    },
    {
      title: 'Transactions',
      subtitle: 'per day',
      info: 'Swaps completed each day.',
      body: chart('transactions', compact, { integerY: true }),
    },
    {
      title: 'Cumulative volume',
      subtitle: `all-time running total · ${money}`,
      info: 'Running total of completed swap volume since launch.',
      body: chart('cumulativeVolume', moneyTick),
    },
    {
      title: 'Cumulative transactions',
      subtitle: 'all-time running total',
      info: 'Running total of completed swaps since launch.',
      body: chart('cumulativeTransactions', compact, { integerY: true }),
    },
    {
      title: 'Success rate',
      subtitle: '% of resolved swaps completed · days with none are gapped',
      info: 'Completed / (completed + timed out) among the swaps resolved each day.',
      body: chart('successRate', (v) => v.toFixed(0), { noArea: true }),
    },
    {
      title: 'Settlement time',
      subtitle: 'median, average dashed · seconds, log scale',
      info: 'Time from initiation to completion. The median is what a typical swap waited; the average moves with one slow swap.',
      body: chart('settlement', (v) => secs(v), {
        logScale: true,
        noArea: true,
      }),
    },
    {
      title: 'Protocol fees',
      subtitle: `per day · 1% of volume · ${money}`,
      info: 'Protocol fees each day: a flat 1% of that day’s volume, enforced by the contract.',
      body: chart('fees', moneyTick),
    },
    {
      title: 'Cumulative fees',
      subtitle: `all-time running total · ${money}`,
      info: 'Running total of protocol fees since launch: 1% of cumulative volume.',
      body: chart('cumulativeFees', moneyTick),
    },
  ];

  return (
    <Stack gap={3}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.62rem',
            color: 'text.secondary',
          }}
        >
          one column per UTC day · today is still filling
        </Typography>
        <RangeChips value={range} options={RANGES} onChange={setRange} />
      </Box>
      <Grid container spacing={3}>
        {panels.map((p) => (
          <Grid item xs={12} md={6} key={p.title}>
            <Panel title={p.title} subtitle={p.subtitle} info={p.info}>
              {p.body}
            </Panel>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

export default StatsSection;
