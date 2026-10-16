import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Grid, Typography, alpha, useTheme } from '@mui/material';
import { Panel, PanelReadout, StatCell, TimeSeriesChart } from '../stats';
import type { HistoryRow } from '../../api/models';
import {
  economicsThroughNow,
  summarizeEconomics,
  weeklyEconomics,
  type EconomicsDay,
  type EmissionDay,
  type PricePoint,
  type TreasuryDay,
} from '../../utils/dailyEconomics';
import { formatUsd, formatUsdCompact } from '../../utils/format';
import { FONTS } from '../../theme';

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

// What fees are measured against, smallest first: what miners were paid
// (the default), then adding validators, then everything emitted.
const REFERENCES: {
  name: string;
  label: string;
  byDefault: boolean;
  pick: (r: EconomicsDay) => number | null;
}[] = [
  {
    name: 'Miner pay',
    label: 'miner pay',
    byDefault: true,
    pick: (r) => r.emissions,
  },
  {
    name: 'Miner + validator pay',
    label: 'miner + validator pay',
    byDefault: false,
    pick: (r) =>
      r.emissions === null || r.validators === null
        ? null
        : r.emissions + r.validators,
  },
  {
    name: 'Total emissions',
    label: 'total emissions',
    byDefault: false,
    pick: (r) =>
      r.emissions === null || r.validators === null || r.owner === null
        ? null
        : r.emissions + r.validators + r.owner,
  },
];

/** Fees and emissions share UTC-day buckets and USD axes. The parent loads
 * the treasury income once and passes it down. */
export default function DailyEconomics({
  history,
  loading,
  days,
  income,
}: {
  history?: HistoryRow[];
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
  // Which recipients the legend shows; the readout compares fees with them.
  const [shown, setShown] = useState<Record<string, boolean>>({});
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
  // Weekly on longer ranges: one busy day otherwise hides the trend.
  const weekly = days > 7;
  const buckets = weekly ? weeklyEconomics(rows) : rows;
  // The reference fees are compared with: miner pay by default, or the
  // largest one switched on in the legend. The burn is never part of it.
  const on = REFERENCES.filter((r) => shown[r.name] ?? false);
  const ref = on[on.length - 1] ?? REFERENCES[0];
  const ratio = (r?: EconomicsDay) => {
    const base = r ? ref.pick(r) : null;
    return r && r.fees !== null && base ? (r.fees / base) * 100 : null;
  };
  const readout = (() => {
    if (weekly) {
      const last = ratio(buckets[buckets.length - 1]);
      const prev = ratio(buckets[buckets.length - 2]);
      if (last === null) return undefined;
      return (
        <PanelReadout>
          fees {pct(last)} of {ref.label} last week
          {prev !== null && (
            <Box
              component="span"
              sx={{ color: 'text.secondary', fontWeight: 500 }}
            >
              {' '}
              {last >= prev ? '▲' : '▼'} from {pct(prev)}
            </Box>
          )}
        </PanelReadout>
      );
    }
    const base = rows.every((r) => ref.pick(r) !== null)
      ? rows.reduce((a, r) => a + (ref.pick(r) as number), 0)
      : null;
    if (totals.fees === null || !base) return undefined;
    return (
      <PanelReadout>
        fees {pct((totals.fees / base) * 100)} of {ref.label} in range
      </PanelReadout>
    );
  })();
  return (
    <Box id="daily-economics" sx={{ scrollMarginTop: 24 }}>
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid item xs={6} md={3}>
          <StatCell
            label="Fees vs. miner pay"
            value={pct(totals.coverage)}
            loading={pending}
            tooltip={`protocol fees ÷ miner emissions: 100% means fees bought back as much as miners were paid${
              totals.totalCoverage === null
                ? ''
                : ` · ${pct(totals.totalCoverage)} of total emissions`
            }`}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCell
            label="Miner emissions"
            value={usd(totals.emissions)}
            loading={pending}
            tooltip="what miners were paid, after the burn"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCell
            label={
              totals.burnRate === null
                ? 'Miner burn'
                : `Miner burn · ${pct(totals.burnRate)}`
            }
            value={usd(totals.burned)}
            loading={pending}
            tooltip="the miner share burned instead of paid, and its % of the miner share; never emitted, so not in total emissions; the burn rate changes over time"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCell
            label="Total emissions"
            value={usd(totals.totalEmissions)}
            loading={pending}
            tooltip={
              totals.totalEmissions === null
                ? 'owner + validators + miners; the burn was never emitted'
                : `owner ${usd(totals.owner)} · validators ${usd(totals.validators)} · miners ${usd(totals.emissions)} · the burn was never emitted`
            }
          />
        </Grid>
      </Grid>
      <Panel
        title="Protocol fees"
        subtitle={
          weekly
            ? 'per week · by source · add miner pay from the legend'
            : `per day · by source · add miner pay from the legend · ${date(rows[0].t)} – ${date(rows[rows.length - 1].t)}`
        }
        headerRight={readout}
        info="Protocol fees by source (transaction, reservation and quote churn), all spent on buybacks. The figure at right compares them with what miners were paid; switch on miner pay, validator pay or total emissions in the legend to draw that line, and the figure follows the largest one shown. Weekly on 30D and ALL so one busy day doesn't hide the trend. Emissions are estimates from chain samples, not measured payouts."
      >
        <TimeSeriesChart
          daily
          noArea
          height={320}
          bucketDays={weekly ? 7 : 1}
          onLegendChange={setShown}
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
            ...REFERENCES.map((ref) => ({
              name: ref.name,
              // Off at first so the fee bars set the scale; the readout
              // still compares with miner pay.
              hiddenByDefault: true,
              straight: true,
              dashed: true,
              formatValue: formatUsd,
              type: 'line' as const,
              color: ref.byDefault
                ? theme.palette.text.secondary
                : theme.palette.text.disabled,
              points: buckets.map((r) => ({ t: r.t, value: ref.pick(r) })),
            })),
          ]}
        />
        <Typography sx={note}>
          {emission.isError
            ? 'Emission data is unavailable, so only fees are shown.'
            : income.solUsdError
              ? 'SOL prices are unavailable, so reservation and churn fees can’t be valued.'
              : !pending && totals.missingDays > 0
                ? `${totals.missingDays} day(s) lack data, so totals are hidden rather than understated.`
                : `Estimates from four chain samples a day at that day’s prices; today is prorated.${
                    emission.data
                      ? ` Updated ${date(Date.parse(emission.data.asOf))}${stale ? ', needs a refresh' : ''}.`
                      : ''
                  }`}
        </Typography>
      </Panel>
    </Box>
  );
}
