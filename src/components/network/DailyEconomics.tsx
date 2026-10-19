import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Grid, Typography, alpha, useTheme } from '@mui/material';
import { Panel, PanelReadout, StatCell, TimeSeriesChart } from '../stats';
import type { HistoryRow } from '../../api/models';
import {
  economicsThroughNow,
  summarizeEconomics,
  dailyEconomics,
  UTC_DAY_MS,
  weeklyEconomics,
  type EconomicsDay,
  type EmissionDay,
  type PricePoint,
  type TreasuryDay,
} from '../../utils/dailyEconomics';
import { formatUsd, formatUsdCompact } from '../../utils/format';
import { FONTS } from '../../theme';
import { MOVE_COLORS } from '../dashboard/AllwaysMarketRate';

type EmissionHistory = {
  netuid: number;
  network: string;
  asOf: string;
  method: string;
  rows: (EmissionDay & {
    samples?: { dailyUsd: number; burnFraction: number }[];
  })[];
};

// What MinerBurned withheld that day, when the source predates `burnedUsd`:
// each sample's after-burn rate is (1 - f) of the pre-burn rate, so the
// withheld part is rate x f / (1 - f), averaged like the emission itself.
const burnedFromSamples = (
  samples?: { dailyUsd: number; burnFraction: number }[],
): number | null => {
  const valid = (samples ?? []).filter(
    (s) =>
      Number.isFinite(s.dailyUsd) &&
      Number.isFinite(s.burnFraction) &&
      s.burnFraction >= 0 &&
      s.burnFraction < 1,
  );
  if (!valid.length || valid.length !== samples?.length) return null;
  return (
    valid.reduce(
      (sum, s) => sum + (s.dailyUsd * s.burnFraction) / (1 - s.burnFraction),
      0,
    ) / valid.length
  );
};

async function loadEmissions(): Promise<EmissionHistory> {
  const base = import.meta.env.VITE_REACT_APP_BASE_URL ?? '';
  const url =
    import.meta.env.VITE_MINER_EMISSIONS_URL ??
    `${base}/economics/emissions/history`;
  // Revalidate every time: the source is regenerated in place.
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) {
    throw new Error('Miner emission history is unavailable');
  }
  const data = (await response.json()) as EmissionHistory;
  if (
    data.netuid !== 7 ||
    data.network !== 'finney' ||
    !Number.isFinite(Date.parse(data.asOf)) ||
    !Array.isArray(data.rows) ||
    !data.rows.every(
      (r) =>
        Number.isFinite(Date.parse(r.t)) &&
        (r.emissionsUsd === null ||
          (typeof r.emissionsUsd === 'number' &&
            Number.isFinite(r.emissionsUsd) &&
            r.emissionsUsd >= 0)),
    )
  ) {
    throw new Error('Miner emission history is invalid');
  }
  return {
    ...data,
    rows: data.rows.map((r) => ({
      ...r,
      burnedUsd:
        typeof r.burnedUsd === 'number'
          ? r.burnedUsd
          : burnedFromSamples(r.samples),
    })),
  };
}

/** Fees and emissions share UTC-day buckets and USD axes. The parent loads
 * the treasury income once and passes it down. */
export default function DailyEconomics({
  history,
  allHistory,
  rangeLabel,
  loading,
  days,
  income,
}: {
  history?: HistoryRow[];
  /** Every day since launch, for the "vs prior" comparisons. */
  allHistory?: HistoryRow[];
  /** "7D" / "30D"; null for ALL, which has no prior period. */
  rangeLabel: string | null;
  loading: boolean;
  days: number;
  income: {
    treasury: TreasuryDay[];
    solUsd?: PricePoint[];
    isLoading: boolean;
    solUsdError: boolean;
  };
}) {
  const theme = useTheme();
  const emission = useQuery({
    queryKey: ['miner-emission-history'],
    queryFn: loadEmissions,
    retry: false,
    refetchInterval: 300_000,
  });
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const rows = useMemo(
    () =>
      economicsThroughNow(
        history ?? [],
        emission.data?.rows ?? [],
        days,
        now,
        income.treasury,
        income.solUsd ?? [],
      ),
    [history, emission.data, days, now, income.treasury, income.solUsd],
  );
  const totals = summarizeEconomics(rows);
  // Change vs the prior period on complete UTC days, like the overview.
  const todayStart = Math.floor(now / UTC_DAY_MS) * UTC_DAY_MS;
  const completeTotals = (end: number) =>
    summarizeEconomics(
      dailyEconomics(
        allHistory ?? [],
        emission.data?.rows ?? [],
        days,
        end,
        income.treasury,
        income.solUsd ?? [],
      ),
    );
  const cur = rangeLabel ? completeTotals(todayStart) : null;
  const prior = rangeLabel
    ? completeTotals(todayStart - days * UTC_DAY_MS)
    : null;
  const change = (pick: (t: typeof totals) => number | null) => {
    const a = cur ? pick(cur) : null;
    const b = prior ? pick(prior) : null;
    return a === null || b === null || b <= 0 ? null : (a / b - 1) * 100;
  };
  const caption = rangeLabel ? `vs prior ${rangeLabel}` : 'since launch';
  const delta = (pick: (t: typeof totals) => number | null) => ({
    pct: rangeLabel ? change(pick) : null,
    caption,
  });
  const coverageDelta = {
    pct:
      cur?.coverage != null && prior?.coverage != null
        ? cur.coverage - prior.coverage
        : null,
    caption,
    points: true,
  };
  const pending = loading || emission.isLoading || income.isLoading;
  const stale =
    emission.data &&
    Date.now() - Date.parse(emission.data.asOf) > 48 * 3600_000;
  const date = (t: number) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(t);
  const note = {
    fontFamily: FONTS.mono,
    fontSize: '0.62rem',
    color: 'text.secondary',
  };
  const usd = (v: number | null) => (v === null ? '—' : formatUsd(v));
  const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`);
  const ink = theme.palette.text.primary;
  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  // Follows the section's range control: daily on 7D, weekly on longer
  // ranges, where one busy day would otherwise hide the trend.
  const weekly = days > 7;
  const buckets = weekly ? weeklyEconomics(rows) : rows;
  // Fees against what miners were paid, the comparison the section makes.
  const ratio = (r?: EconomicsDay) =>
    r && r.fees !== null && r.emissions ? (r.fees / r.emissions) * 100 : null;
  const readout = (() => {
    if (weekly) {
      const last = ratio(buckets[buckets.length - 1]);
      const prev = ratio(buckets[buckets.length - 2]);
      if (last === null) return undefined;
      return (
        <PanelReadout>
          fees {pct(last)} of miner pay last week
          {prev !== null && (
            <Box
              component="span"
              sx={{ color: 'text.secondary', fontWeight: 500 }}
            >
              {' '}
              <Box
                component="span"
                sx={{ color: last >= prev ? move.up : move.down }}
              >
                {last >= prev ? '▲' : '▼'}
              </Box>{' '}
              from {pct(prev)}
            </Box>
          )}
        </PanelReadout>
      );
    }
    // Daily: the meter above already carries the range's figure.
    return undefined;
  })();
  return (
    <Box id="daily-economics" sx={{ scrollMarginTop: 24 }}>
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid item xs={6} md={3}>
          <StatCell
            label="Transaction fees"
            value={usd(totals.swapFees)}
            loading={pending}
            tooltip="the 1% fee on every completed swap, at the swap’s hour"
            delta={delta((t) => t.swapFees)}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCell
            label="Reservation fees"
            value={usd(totals.reservationFees)}
            loading={pending}
            tooltip="SOL paid to reserve a miner’s quote, at that day’s SOL price"
            delta={delta((t) => t.reservationFees)}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCell
            label="Quote churn fees"
            value={usd(totals.churnFees)}
            loading={pending}
            tooltip="SOL miners pay to change a quote within 10 minutes of the last change"
            // A penalty on quote flashing: fewer of them is healthy, so a
            // red arrow would misread it.
            delta={{ pct: null, caption: 'penalty for flashing quotes' }}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCell
            label="Miner pay"
            value={usd(totals.emissions)}
            loading={pending}
            tooltip={`estimated emissions paid to miners, at each day’s price; the burned share was never paid${
              totals.coverage === null
                ? ''
                : ` · fees were ${pct(totals.coverage)} of it`
            }`}
            delta={delta((t) => t.emissions)}
          />
        </Grid>
      </Grid>
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <StatCell
          label="Fees offset"
          loading={pending}
          tooltip="protocol fees ÷ what miners were paid in the range. Fees buy back alpha, so at 100% the buybacks fully offset miner emissions."
          delta={coverageDelta}
        >
          <OffsetMeter
            coverage={totals.coverage}
            fees={totals.fees}
            minerPay={totals.emissions}
            coveredDays={totals.coveredDays}
            comparableDays={totals.comparableDays}
          />
        </StatCell>
      </Box>
      <Panel
        title="Fees vs. miner pay"
        subtitle={`${weekly ? 'per week' : 'per day'} · fees by source, miner pay dashed · ${date(rows[0].t)} – ${date(rows[rows.length - 1].t)}`}
        headerRight={readout}
        info="Protocol fees by source (transaction, reservation and quote churn), all spent on buybacks, with what miners were paid as a dashed line. A column above the line is a period where fees fully offset miner emissions. On weekly views the figure at right is the latest week's share. Daily on 7D, weekly on 30D and ALL so one busy day doesn't hide the trend. Emissions are estimates from chain samples, not measured payouts."
      >
        <TimeSeriesChart
          daily
          noArea
          height={320}
          bucketDays={weekly ? 7 : 1}
          stackTotals={weekly}
          staticLegend
          loading={pending}
          formatValue={formatUsdCompact}
          series={[
            {
              name: 'Transaction fees',
              formatValue: formatUsd,
              type: 'bar',
              stack: 'fees',
              color: ink,
              points: buckets.map((r) => ({ t: r.t, value: r.swapFees })),
            },
            {
              name: 'Reservation fees',
              formatValue: formatUsd,
              type: 'bar',
              stack: 'fees',
              color: alpha(ink, 0.55),
              points: buckets.map((r) => ({
                t: r.t,
                value: r.reservationFees,
              })),
            },
            {
              name: 'Quote churn fees',
              formatValue: formatUsd,
              type: 'bar',
              stack: 'fees',
              color: alpha(ink, 0.28),
              points: buckets.map((r) => ({ t: r.t, value: r.churnFees })),
            },
            {
              name: 'Miner pay',
              formatValue: formatUsd,
              color: ink,
              dashed: true,
              straight: true,
              points: buckets.map((r) => ({ t: r.t, value: r.emissions })),
            },
          ]}
        />
        {totals.emissions !== null && (
          <Typography sx={{ ...note, color: 'text.primary' }}>
            Emissions in range: miners paid {usd(totals.emissions)} · burned{' '}
            {usd(totals.burned)}
            {totals.burnRate !== null
              ? ` (${pct(totals.burnRate)} of the miner share, never emitted)`
              : ''}{' '}
            · validators {usd(totals.validators)} · owner {usd(totals.owner)} ·
            total emitted {usd(totals.totalEmissions)}
          </Typography>
        )}
        <Typography sx={note}>
          {emission.isError
            ? 'Emission data is unavailable, so only fees are shown.'
            : income.solUsdError
              ? 'SOL prices are unavailable, so reservation and churn fees can’t be valued.'
              : !pending && totals.missingDays > 0
                ? `${totals.missingDays} day(s) lack data, so totals are hidden rather than understated.`
                : `${weekly ? 'Whole weeks of complete days. ' : 'Today is still filling. '}Emissions are estimates from four chain samples a day at that day’s prices.${
                    emission.data
                      ? ` Updated ${date(Date.parse(emission.data.asOf))}${stale ? ', needs a refresh' : ''}.`
                      : ''
                  }`}
        </Typography>
      </Panel>
    </Box>
  );
}

/** How much of miner pay the fees offset, on a track with 100% marked: past
 * the mark, buybacks outweighed what miners were paid. */
function OffsetMeter({
  coverage,
  fees,
  minerPay,
  coveredDays,
  comparableDays,
}: {
  coverage: number | null;
  fees: number | null;
  minerPay: number | null;
  coveredDays: number;
  comparableDays: number;
}) {
  const theme = useTheme();
  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const mono = { fontFamily: FONTS.mono, fontVariantNumeric: 'tabular-nums' };
  if (coverage === null || fees === null || minerPay === null)
    return (
      <Typography sx={{ ...mono, fontSize: '1.4rem', fontWeight: 700 }}>
        —
      </Typography>
    );
  const offset = coverage >= 100;
  // The track runs to 150% (or further when fees ran past it), so the 100%
  // mark sits two thirds along and a surplus has room to show.
  const scale = Math.max(150, coverage * 1.1);
  const at = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
  const gap = fees - minerPay;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          sx={{ ...mono, fontSize: '1.4rem', fontWeight: 700, lineHeight: 1 }}
        >
          {coverage.toFixed(1)}%
        </Typography>
        <Typography
          sx={{ ...mono, fontSize: '0.72rem', color: 'text.secondary' }}
        >
          {offset
            ? 'fees fully offset miner pay'
            : 'of miner pay offset by fees'}
        </Typography>
      </Box>
      <Box sx={{ position: 'relative', pt: 2 }}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: at(100),
            transform: 'translateX(-50%)',
            ...mono,
            fontSize: '0.58rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            whiteSpace: 'nowrap',
          }}
        >
          100% · fully offset
        </Box>
        <Box sx={{ position: 'relative', height: 10, bgcolor: 'action.hover' }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              right: 'auto',
              width: at(coverage),
              bgcolor: offset ? move.up : 'text.primary',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: -4,
              bottom: -4,
              left: at(100),
              borderLeft: '1px dashed',
              borderColor: 'text.primary',
            }}
          />
        </Box>
      </Box>
      <Typography
        sx={{ ...mono, fontSize: '0.62rem', color: 'text.secondary' }}
      >
        {formatUsd(fees)} fees vs {formatUsd(minerPay)} miner pay ·{' '}
        <Box
          component="span"
          sx={{ color: gap >= 0 ? move.up : 'text.primary', fontWeight: 600 }}
        >
          {formatUsd(Math.abs(gap))} {gap >= 0 ? 'surplus' : 'short'}
        </Box>
        {comparableDays > 0 &&
          ` · fees beat miner pay on ${coveredDays} of ${comparableDays} days`}
      </Typography>
    </Box>
  );
}
