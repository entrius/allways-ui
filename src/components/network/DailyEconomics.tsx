import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { Panel, StatCell, TimeSeriesChart } from '../stats';
import type { HistoryRow } from '../../api/models';
import {
  economicsThroughNow,
  summarizeEconomics,
  type EmissionDay,
  type PricePoint,
  type TreasuryDay,
} from '../../utils/dailyEconomics';
import { formatUsd } from '../../utils/format';
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
    fontSize: '0.7rem',
    color: 'text.secondary',
  };
  const usd = (v: number | null) => (v === null ? '—' : formatUsd(v));
  const pct = (v: number | null) => (v === null ? '—' : `${v.toFixed(1)}%`);
  const ink = theme.palette.text.primary;
  const caption = {
    fontFamily: FONTS.mono,
    fontSize: '0.62rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'text.secondary',
  } as const;
  return (
    <Box id="daily-economics" sx={{ scrollMarginTop: 24 }}>
      <Panel
        title="Fees vs. emissions"
        subtitle={`${date(rows[0].t)} – ${date(rows[rows.length - 1].t)} · USD · today so far`}
        info="Protocol fees (transaction, reservation and quote churn) fund buybacks. When the fee bars reach the dashed line, fees covered what miners earned that day. Emissions are estimates from chain samples, not measured payouts."
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          <StatCell
            label="Protocol fees"
            value={usd(totals.fees)}
            loading={pending}
          />
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
        </Box>
        <TimeSeriesChart
          daily
          noArea
          height={280}
          loading={pending}
          formatValue={formatUsd}
          series={[
            {
              name: 'Transaction fees',
              type: 'bar',
              stack: 'fees',
              color: ink,
              points: rows.map((r) => ({ t: r.t, value: r.swapFees })),
            },
            {
              name: 'Reservation fees',
              type: 'bar',
              stack: 'fees',
              color: alpha(ink, 0.55),
              points: rows.map((r) => ({ t: r.t, value: r.reservationFees })),
            },
            {
              name: 'Quote churn fees',
              type: 'bar',
              stack: 'fees',
              color: alpha(ink, 0.28),
              points: rows.map((r) => ({ t: r.t, value: r.churnFees })),
            },
            {
              name: 'Miner emissions',
              type: 'line',
              dashed: true,
              color: theme.palette.text.secondary,
              points: rows.map((r) => ({ t: r.t, value: r.emissions })),
            },
          ]}
        />
        <Box>
          <Typography sx={caption}>Where emissions go, per day</Typography>
          <TimeSeriesChart
            daily
            noArea
            height={200}
            loading={pending}
            formatValue={formatUsd}
            series={[
              {
                name: 'Miners',
                type: 'bar',
                stack: 'emissions',
                color: ink,
                points: rows.map((r) => ({ t: r.t, value: r.emissions })),
              },
              {
                name: 'Miner burn',
                type: 'bar',
                stack: 'emissions',
                color: alpha(ink, 0.15),
                points: rows.map((r) => ({ t: r.t, value: r.burned })),
              },
              {
                name: 'Validators',
                type: 'bar',
                stack: 'emissions',
                color: alpha(ink, 0.55),
                points: rows.map((r) => ({ t: r.t, value: r.validators })),
              },
              {
                name: 'Owner',
                type: 'bar',
                stack: 'emissions',
                color: alpha(ink, 0.32),
                points: rows.map((r) => ({ t: r.t, value: r.owner })),
              },
            ]}
          />
        </Box>
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
