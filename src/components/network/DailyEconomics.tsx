import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { Panel, StatCell, TimeSeriesChart } from '../stats';
import type { HistoryRow } from '../../api/models';
import { fetchSolUsdHistory, fetchTreasury } from '../../api';
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
  rows: EmissionDay[];
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
  return data;
}

/** Reservation and quote-churn income for one UTC day; a failed call is a
 * gap, never zero. */
async function loadTreasuryDay(t: number): Promise<TreasuryDay> {
  try {
    const day = await fetchTreasury(t / 1000, (t + UTC_DAY_MS) / 1000 - 1);
    return {
      t,
      reservationLamports: day.sources.reservationFee.lamports,
      churnLamports: day.sources.quoteChurnFee.lamports,
    };
  } catch {
    return { t, reservationLamports: null, churnLamports: null };
  }
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
  // Completed days never change, so they load once per window; today's
  // income keeps accruing and refreshes with the fee history.
  const todayStart = Math.floor(now / UTC_DAY_MS) * UTC_DAY_MS;
  const pastIncome = useQuery({
    queryKey: ['treasury-daily', days, todayStart],
    queryFn: () =>
      Promise.all(
        Array.from({ length: days }, (_, i) =>
          loadTreasuryDay(todayStart - (days - i) * UTC_DAY_MS),
        ),
      ),
    staleTime: Infinity,
  });
  const todayIncome = useQuery({
    queryKey: ['treasury-today', todayStart],
    queryFn: () => loadTreasuryDay(todayStart),
    refetchInterval: 300_000,
  });
  const solUsd = useQuery({
    queryKey: ['sol-usd-daily', days],
    queryFn: () => fetchSolUsdHistory(days + 1),
    staleTime: 3_600_000,
    retry: 1,
  });
  const treasury = useMemo(
    () => [
      ...(pastIncome.data ?? []),
      ...(todayIncome.data ? [todayIncome.data] : []),
    ],
    [pastIncome.data, todayIncome.data],
  );
  const rows = useMemo(
    () =>
      economicsThroughNow(
        history ?? [],
        emission.data?.rows ?? [],
        days,
        now,
        treasury,
        solUsd.data ?? [],
      ),
    [history, emission.data, days, now, treasury, solUsd.data],
  );
  const totals = summarizeEconomics(rows);
  const today = rows[rows.length - 1];
  const pending =
    loading ||
    emission.isLoading ||
    pastIncome.isLoading ||
    todayIncome.isLoading ||
    solUsd.isLoading;
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
        info="All fees paid into the treasury (swap fees, reservation fees and quote-churn fees) versus estimated miner rewards after burn. All protocol fees fund buybacks. A fee bar above the emission line means fees exceeded estimated miner rewards that day. Owner and validator rewards and operating costs are excluded."
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <StatCell
            label="All fees"
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
            label="Emission coverage"
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
        </Box>
        <TimeSeriesChart
          daily
          noArea
          height={300}
          loading={pending}
          formatValue={formatUsd}
          series={[
            {
              name: 'Swap fees',
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
          ]}
        />
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
            When the fee stack rises above the dashed line, buyback funding
            exceeds estimated miner emissions. Totals include today’s fees so
            far. Today’s emissions are prorated to elapsed UTC time and update
            each minute.
          </Typography>
          <Typography sx={note}>
            Reservation and quote-churn fees are SOL paid into the treasury,
            valued at that day’s average SOL price. Reservation fees are
            reservations times the current reservation fee.
          </Typography>
          {solUsd.isError ? (
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
