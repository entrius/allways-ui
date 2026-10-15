import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { Panel, StatCell, TimeSeriesChart } from '../stats';
import type { HistoryRow } from '../../api/models';
import { useDailyTreasury } from '../../api';
import {
  economicsThroughNow,
  summarizeEconomics,
  UTC_DAY_MS,
  type EmissionDay,
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
  const response = await fetch(url);
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

/** Fees and miner-only emissions share UTC-day buckets and USD axes. */
export default function DailyEconomics({
  history,
  loading,
  days,
}: {
  history?: HistoryRow[];
  loading: boolean;
  days: number;
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
  const todayStart = Math.floor(now / UTC_DAY_MS) * UTC_DAY_MS;
  const income = useDailyTreasury(days, todayStart);
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
  const windowIncome = income.treasury.filter((d) => d.t >= rows[0].t);
  const eventTotal = (pick: (d: TreasuryDay) => number | null | undefined) =>
    windowIncome.length === rows.length &&
    windowIncome.every((d) => typeof pick(d) === 'number')
      ? windowIncome.reduce((sum, d) => sum + (pick(d) as number), 0)
      : null;
  const events = {
    reservations: eventTotal((d) => d.reservationEvents),
    churn: eventTotal((d) => d.churnEvents),
  };
  const today = rows[rows.length - 1];
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
  return (
    <Box id="daily-economics" sx={{ scrollMarginTop: 24 }}>
      <Panel
        title="Daily fees vs. miner emissions"
        subtitle={`${date(rows[0].t)} – ${date(rows[rows.length - 1].t)} · ${days} complete UTC days + today so far · USD`}
        info="All protocol fees paid into the treasury (transaction fees, reservation fees and quote-churn fees) versus estimated miner rewards after burn. All protocol fees fund buybacks. A fee bar above the emission line means fees exceeded estimated miner rewards that day. Owner and validator rewards and operating costs are excluded."
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
            value={totals.fees === null ? '—' : formatUsd(totals.fees)}
            loading={pending}
          />
          <StatCell
            label="Est. miner emissions"
            value={
              totals.emissions === null ? '—' : formatUsd(totals.emissions)
            }
            loading={pending}
          />
          <StatCell
            label="Fees as % of emissions"
            value={
              totals.coverage === null ? '—' : `${totals.coverage.toFixed(1)}%`
            }
            loading={pending}
          />
          <StatCell
            label="Fees minus est. emissions"
            value={
              totals.surplus === null
                ? '—'
                : `${totals.surplus > 0 ? '+' : ''}${formatUsd(totals.surplus)}`
            }
            loading={pending}
          />
          <StatCell
            label="Transaction fees"
            value={totals.swapFees === null ? '—' : formatUsd(totals.swapFees)}
            loading={pending}
            tooltip="1% of completed swap volume, at the price of each swap’s hour"
          />
          <StatCell
            label="Reservation fees"
            value={
              totals.reservationFees === null
                ? '—'
                : formatUsd(totals.reservationFees)
            }
            loading={pending}
            tooltip={
              events.reservations === null
                ? undefined
                : `${events.reservations.toLocaleString('en-US')} reservations at the current reservation fee`
            }
          />
          <StatCell
            label="Quote churn fees"
            value={
              totals.churnFees === null ? '—' : formatUsd(totals.churnFees)
            }
            loading={pending}
            tooltip={
              events.churn === null
                ? undefined
                : `${events.churn.toLocaleString('en-US')} quote updates inside the anti-flashing window`
            }
          />
          <StatCell
            label="Non-transaction share"
            value={
              totals.fees === null ||
              totals.fees === 0 ||
              totals.reservationFees === null ||
              totals.churnFees === null
                ? '—'
                : `${(((totals.reservationFees + totals.churnFees) / totals.fees) * 100).toFixed(1)}%`
            }
            loading={pending}
            tooltip="reservation + quote churn fees as a share of protocol fees"
          />
          <StatCell
            label="Miner emissions before burn"
            value={
              totals.emissions === null || totals.burned === null
                ? '—'
                : formatUsd(totals.emissions + totals.burned)
            }
            loading={pending}
            tooltip="estimated miner emissions plus what MinerBurned withheld"
          />
          <StatCell
            label="Miner burn"
            value={totals.burned === null ? '—' : formatUsd(totals.burned)}
            loading={pending}
            tooltip="miner emissions withheld by MinerBurned, which changes over time"
          />
          <StatCell
            label="Burn rate"
            value={
              totals.burnRate === null ? '—' : `${totals.burnRate.toFixed(1)}%`
            }
            loading={pending}
            tooltip="miner burn as a share of miner emissions before burn"
          />
          <StatCell
            label="Days fees beat emissions"
            value={
              totals.comparableDays
                ? `${totals.coveredDays} of ${totals.comparableDays}`
                : '—'
            }
            loading={pending}
            tooltip="days whose protocol fees matched or exceeded that day’s miner emissions"
          />
        </Box>
        <TimeSeriesChart
          daily
          noArea
          height={300}
          loading={pending}
          formatValue={formatUsd}
          series={[
            {
              name: 'Transaction fees',
              type: 'bar',
              stack: 'fees',
              color: theme.palette.text.primary,
              points: rows.map((r) => ({ t: r.t, value: r.swapFees })),
            },
            {
              name: 'Reservation fees',
              type: 'bar',
              stack: 'fees',
              color: alpha(theme.palette.text.primary, 0.55),
              points: rows.map((r) => ({ t: r.t, value: r.reservationFees })),
            },
            {
              name: 'Quote churn fees',
              type: 'bar',
              stack: 'fees',
              color: alpha(theme.palette.text.primary, 0.28),
              points: rows.map((r) => ({ t: r.t, value: r.churnFees })),
            },
            {
              name: 'Estimated miner emissions',
              type: 'line',
              dashed: true,
              color: theme.palette.text.secondary,
              points: rows.map((r) => ({ t: r.t, value: r.emissions })),
            },
            {
              name: 'Before miner burn',
              type: 'line',
              dashed: true,
              color: theme.palette.text.disabled,
              points: rows.map((r) => ({
                t: r.t,
                value:
                  r.emissions === null || r.burned === null
                    ? null
                    : r.emissions + r.burned,
              })),
            },
          ]}
        />
        <Box>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.62rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            Fees as % of miner emissions, per day
          </Typography>
          <TimeSeriesChart
            daily
            noArea
            height={160}
            loading={pending}
            formatValue={(v) => `${v.toFixed(0)}%`}
            series={[
              {
                name: 'Fees as % of emissions',
                type: 'bar',
                color: theme.palette.text.primary,
                points: rows.map((r) => ({
                  t: r.t,
                  value:
                    r.fees === null || r.emissions === null || r.emissions <= 0
                      ? null
                      : (r.fees / r.emissions) * 100,
                })),
              },
              {
                name: 'Break-even (100%)',
                type: 'line',
                dashed: true,
                color: theme.palette.text.secondary,
                points: rows.map((r) => ({ t: r.t, value: 100 })),
              },
            ]}
          />
        </Box>
        <Stack gap={0.75}>
          {today.fees !== null && today.emissions !== null && (
            <Typography sx={{ ...note, color: 'text.primary' }}>
              Today so far: {formatUsd(today.fees)} in fees ·{' '}
              {formatUsd(today.emissions)} estimated miner emissions so far
              {today.emissions > 0
                ? ` · ${((today.fees / today.emissions) * 100).toFixed(1)}% covered`
                : ''}
              .
            </Typography>
          )}
          <Typography sx={note}>
            When the fee stack rises above the dark dashed line, buyback funding
            exceeds estimated miner emissions. The faint dashed line is
            emissions before the miner burn; the gap between them is what
            MinerBurned withheld that day. Totals include today’s fees so far.
            Today’s emissions are prorated to elapsed UTC time and update each
            minute.
          </Typography>
          <Typography sx={note}>
            Reservation and quote-churn fees are SOL paid into the treasury,
            valued at that day’s average SOL price. Reservation fees are
            reservations times the current reservation fee.
          </Typography>
          {income.solUsdError ? (
            <Typography role="status" sx={note}>
              SOL price history is unavailable, so reservation and churn fees
              can’t be valued. Totals and coverage are unavailable.
            </Typography>
          ) : null}
          {emission.isError ? (
            <Typography role="status" sx={note}>
              Miner emission history is unavailable. Fees are shown; coverage is
              unavailable.
            </Typography>
          ) : !pending && totals.missingDays > 0 ? (
            <Typography role="status" sx={note}>
              {totals.missingDays} day(s) have missing or unpriced data. Gaps
              are not zero; coverage is unavailable.
            </Typography>
          ) : null}
          {emission.data && (
            <Typography sx={note}>
              Estimates: four historical chain samples per day, after burn, with
              that time’s token prices. Not measured payouts.{' '}
              {stale ? 'Source needs a refresh. ' : ''}
              Updated {date(Date.parse(emission.data.asOf))} UTC. Not net
              business profit.
            </Typography>
          )}
        </Stack>
      </Panel>
    </Box>
  );
}
