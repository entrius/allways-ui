import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Grid, Typography, alpha, useTheme } from '@mui/material';
import { Panel, PanelReadout, StatCell, TimeSeriesChart } from '../stats';
import type { HistoryRow } from '../../api/models';
import {
  economicsThroughNow,
  summarizeEconomics,
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
  return (
    <Box id="daily-economics" sx={{ scrollMarginTop: 24 }}>
      {/* Headline figures in the same row every Network Stats group opens
          with, then the one chart they summarise. */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid item xs={6} md={3}>
          <StatCell
            label="Protocol fees"
            value={usd(totals.fees)}
            loading={pending}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCell
            label="Miner emissions"
            value={usd(totals.emissions)}
            loading={pending}
            tooltip={
              totals.burned === null
                ? 'after the miner burn'
                : `after the miner burn · ${formatUsd(totals.burned)} burned (${pct(totals.burnRate)})`
            }
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCell
            label="Fees cover"
            value={pct(totals.coverage)}
            loading={pending}
            tooltip={
              totals.totalCoverage === null
                ? 'protocol fees as a share of miner emissions'
                : `protocol fees as a share of miner emissions · ${pct(totals.totalCoverage)} of total emissions`
            }
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCell
            label="Total emissions"
            value={usd(totals.totalEmissions)}
            loading={pending}
            tooltip={
              totals.totalEmissions === null
                ? 'owner + validators + miners, paid and burned'
                : `owner ${usd(totals.owner)} · validators ${usd(totals.validators)} · miners ${usd(totals.emissions)} · burned ${usd(totals.burned)}`
            }
          />
        </Grid>
      </Grid>
      <Panel
        title="Fees vs. emissions"
        subtitle={`per day · emissions by recipient, fees as a line · ${date(rows[0].t)} – ${date(rows[rows.length - 1].t)}`}
        headerRight={
          totals.coverage === null ? undefined : (
            <PanelReadout>{pct(totals.coverage)} covered in range</PanelReadout>
          )
        }
        info="Bars are what SN7 emits each day, miners at the base, then validators, the owner, and the miner share burned. The line is protocol fees (transaction, reservation and quote churn), which fund buybacks. Where the line clears the miners segment, fees covered miner emissions. Emissions are estimates from chain samples, not measured payouts."
      >
        {/* One chart: what the subnet emits each day, stacked with miners at
            the base, and protocol fees as a line over it. Where the line
            clears the miners segment, fees covered miner emissions; the whole
            stack is total emissions. Fees by source have their own charts. */}
        <TimeSeriesChart
          daily
          noArea
          height={320}
          loading={pending}
          formatValue={formatUsdCompact}
          series={[
            {
              name: 'Miners',
              formatValue: formatUsd,
              type: 'bar',
              stack: 'emissions',
              color: alpha(ink, 0.5),
              points: rows.map((r) => ({ t: r.t, value: r.emissions })),
            },
            {
              name: 'Validators',
              formatValue: formatUsd,
              type: 'bar',
              stack: 'emissions',
              color: alpha(ink, 0.3),
              points: rows.map((r) => ({ t: r.t, value: r.validators })),
            },
            {
              name: 'Owner',
              formatValue: formatUsd,
              type: 'bar',
              stack: 'emissions',
              color: alpha(ink, 0.16),
              points: rows.map((r) => ({ t: r.t, value: r.owner })),
            },
            {
              name: 'Miner burn',
              formatValue: formatUsd,
              type: 'bar',
              stack: 'emissions',
              color: alpha(ink, 0.06),
              points: rows.map((r) => ({ t: r.t, value: r.burned })),
            },
            {
              name: 'Protocol fees',
              formatValue: formatUsd,
              type: 'line',
              color: ink,
              points: rows.map((r) => ({ t: r.t, value: r.fees })),
            },
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
