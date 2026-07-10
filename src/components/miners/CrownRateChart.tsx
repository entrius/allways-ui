import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import {
  ALL_DIRECTIONS,
  decomposeDirection,
  useCrownRateHistory,
  useMinerRateHistory,
  type CrownRateHistoryRow,
  type Direction,
} from '../../api';
import { Panel, TimeSeriesChart, type ChartSeries } from '../stats';
import { FONTS } from '../../theme';

type CrownRange = '1h' | '4h' | '24h' | '4d';

const RANGE_SECS: Record<CrownRange, number> = {
  '1h': 3600,
  '4h': 14_400,
  '24h': 86_400,
  // Matches the API's RATE_MAX_SECS cap — the crown rate line reads
  // crown_holders, which alw-utils prunes, so the widest chip stops at ~4d.
  '4d': 345_600,
};

// One panel per direction. Monochrome like Network Stats — the line is the
// theme's primary text shade, the crown reference (miner mode) the disabled
// shade. Every rate is "to per 1 from" ("1 {from} = {value} {to}") for all
// four.
const DIRECTION_META: Record<
  Direction,
  {
    label: string;
    from: string;
    to: string;
    caption: string;
  }
> = {
  'SOL-BTC': {
    label: 'SOL → BTC',
    from: 'SOL',
    to: 'BTC',
    caption: 'BTC per 1 SOL',
  },
  'BTC-SOL': {
    label: 'BTC → SOL',
    from: 'BTC',
    to: 'SOL',
    caption: 'SOL per 1 BTC',
  },
  'SOL-TAO': {
    label: 'SOL → TAO',
    from: 'SOL',
    to: 'TAO',
    caption: 'TAO per 1 SOL',
  },
  'TAO-SOL': {
    label: 'TAO → SOL',
    from: 'TAO',
    to: 'SOL',
    caption: 'SOL per 1 TAO',
  },
};

const fmt = (n: number): string => {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 1) return n.toFixed(2);
  if (abs >= 0.001) return n.toFixed(4);
  return n.toExponential(1);
};

type RateRow = { t: number; rate: number };

/** "1 SOL = 0.0001 BTC" readout shown in a panel's header. */
const LatestRate: React.FC<{ direction: Direction; rate: number }> = ({
  direction,
  rate,
}) => {
  const meta = DIRECTION_META[direction];
  return (
    <Stack
      direction="row"
      alignItems="baseline"
      spacing={0.6}
      sx={{ fontFamily: FONTS.mono, whiteSpace: 'nowrap' }}
    >
      <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
        1 {meta.from} =
      </Box>
      <Box
        component="span"
        sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.85rem' }}
      >
        {fmt(rate)}
      </Box>
      <Box
        component="span"
        sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
      >
        {meta.to}
      </Box>
    </Stack>
  );
};

const CrownRateChart: React.FC<{
  range: CrownRange;
  onRangeChange: (r: CrownRange) => void;
  minerHotkey?: string;
}> = ({ range, onRangeChange, minerHotkey }) => {
  const theme = useTheme();
  const secs = RANGE_SECS[range];
  const minerMode = !!minerHotkey;
  // Monochrome, matching the Network Stats charts.
  const cLine = theme.palette.text.primary;
  const cReference = theme.palette.text.disabled;

  // One fixed hook per direction (order is stable, so the rules of hooks hold).
  const solBtc = useCrownRateHistory({ direction: 'SOL-BTC', secs }).data;
  const btcSol = useCrownRateHistory({ direction: 'BTC-SOL', secs }).data;
  const solTao = useCrownRateHistory({ direction: 'SOL-TAO', secs }).data;
  const taoSol = useCrownRateHistory({ direction: 'TAO-SOL', secs }).data;
  const { data: minerRates } = useMinerRateHistory(minerHotkey ?? '');

  const crownByDir = useMemo<
    Record<Direction, CrownRateHistoryRow[] | undefined>
  >(
    () => ({
      'SOL-BTC': solBtc,
      'BTC-SOL': btcSol,
      'SOL-TAO': solTao,
      'TAO-SOL': taoSol,
    }),
    [solBtc, btcSol, solTao, taoSol],
  );

  // Use reduce instead of `Math.max(...arr)` to avoid spreading large arrays.
  const head = useMemo(() => {
    const maxT = (arr: { t: number }[] | undefined) =>
      (arr ?? []).reduce((m, p) => (p.t > m ? p.t : m), 0);
    return ALL_DIRECTIONS.reduce(
      (m, dir) => Math.max(m, maxT(crownByDir[dir])),
      0,
    );
  }, [crownByDir]);
  const lo = Math.max(0, head - secs + 1);

  // {crown, miner} rows per direction, clipped to the shared window so all
  // four panels cover the same time span.
  const seriesByDir = useMemo(() => {
    const inRange = <T extends { t: number }>(arr: T[] | undefined) =>
      (arr ?? []).filter((p) => p.t >= lo && p.t <= head);
    const strip = (rows: CrownRateHistoryRow[]): RateRow[] =>
      rows.map((r) => ({ t: r.t, rate: r.rate }));
    const minerFor = (direction: Direction): RateRow[] => {
      if (!minerHotkey) return [];
      const { from, to } = decomposeDirection(direction);
      return inRange(minerRates ?? [])
        .filter((r) => r.fromChain === from && r.toChain === to)
        .map((r) => ({ t: r.t, rate: r.rate }));
    };
    return ALL_DIRECTIONS.reduce(
      (acc, dir) => {
        acc[dir] = {
          crown: strip(inRange(crownByDir[dir])),
          miner: minerFor(dir),
        };
        return acc;
      },
      {} as Record<Direction, { crown: RateRow[]; miner: RateRow[] }>,
    );
  }, [crownByDir, minerRates, minerHotkey, lo, head]);

  const chartSeries = (dir: Direction): ChartSeries[] => {
    const meta = DIRECTION_META[dir];
    const s = seriesByDir[dir];
    const points = (rows: RateRow[]) =>
      rows.map((r) => ({ t: r.t * 1000, value: r.rate }));
    if (!minerMode) {
      return [
        {
          name: 'crown',
          points: points(s.crown),
          color: cLine,
          formatValue: fmt,
          unit: meta.to,
        },
      ];
    }
    return [
      {
        name: 'miner',
        points: points(s.miner),
        color: cLine,
        formatValue: fmt,
        unit: meta.to,
      },
      {
        name: 'crown',
        points: points(s.crown),
        color: cReference,
        formatValue: fmt,
        unit: meta.to,
        dashed: true,
      },
    ];
  };

  const title = minerMode ? 'Miner Rate' : 'Crown Rate';
  const tagline = minerMode
    ? 'this miner over time · crown shown dashed for reference'
    : 'best rate per direction, over time';

  return (
    <Box sx={{ mb: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.62rem',
              color: 'text.disabled',
              mt: 0.25,
            }}
          >
            {tagline}
          </Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={range}
          onChange={(_e, v) => v && onRangeChange(v)}
        >
          {(Object.keys(RANGE_SECS) as CrownRange[]).map((r) => (
            <ToggleButton
              key={r}
              value={r}
              sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}
            >
              {r}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <Grid container spacing={2}>
        {ALL_DIRECTIONS.map((dir) => {
          const meta = DIRECTION_META[dir];
          const s = seriesByDir[dir];
          const primary = minerMode ? s.miner : s.crown;
          const latest = primary.length
            ? primary[primary.length - 1].rate
            : null;
          return (
            <Grid item xs={12} md={6} key={dir}>
              <Panel
                title={meta.label}
                subtitle={meta.caption}
                info={
                  minerMode
                    ? `This miner's quoted ${meta.label} rate over time; the network's best (crown) rate is dashed for reference.`
                    : `Best ${meta.label} rate quoted by any active miner over time.`
                }
                headerRight={
                  latest != null ? (
                    <LatestRate direction={dir} rate={latest} />
                  ) : undefined
                }
              >
                <TimeSeriesChart
                  series={chartSeries(dir)}
                  height={180}
                  formatValue={fmt}
                  autoScale
                  emptyLabel="no rate history yet"
                />
              </Panel>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default CrownRateChart;
