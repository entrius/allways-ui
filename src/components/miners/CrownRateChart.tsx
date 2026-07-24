import React, { useMemo } from 'react';
import { Box, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  ALL_DIRECTIONS,
  decomposeDirection,
  directionalRateFor,
  useCrownRateHistory,
  useMinerRateHistory,
  type CrownRateHistoryRow,
  type Direction,
  type RateRange,
} from '../../api';
import { TimeSeriesChart, type ChartSeries } from '../stats';
import RangeChips from '../RangeChips';
import SectionHeading from '../SectionHeading';
import { FONTS } from '../../theme';

type CrownRange = RateRange;

// The leaderboard's lookback set, so the whole page shares one range
// vocabulary. The crown rate line reads crown_holders, which alw-utils prunes
// at ~4d (RATE_MAX_SECS) — 7d/30d requests get clamped server-side and render
// the data that exists.
const RANGE_SECS: Record<CrownRange, number> = {
  '1h': 3600,
  '24h': 86_400,
  '7d': 604_800,
  '30d': 2_592_000,
};

// One panel per direction. Monochrome like Network Stats — the line is the
// theme's primary text shade, the crown reference (miner mode) the disabled
// shade. Every rendered rate is directional "to per 1 from" ("1 {from} =
// {value} {to}") for all four — seriesByDir converts the canonical stored
// values at ingest.
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

// Full-precision plain decimal — the rate is never rounded, clipped, or
// shown in scientific notation.
const fmt = (n: number): string => {
  const s = String(n);
  if (!s.includes('e')) return s;
  // Values JS stringifies exponentially (below 1e-7) get expanded by hand.
  const digits = Math.max(0, 15 - Math.floor(Math.log10(Math.abs(n))));
  return n.toFixed(Math.min(20, digits)).replace(/\.?0+$/, '');
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
  // four panels cover the same time span. Stored rates are canonical "spoke
  // per 1 SOL"; convert to the panel's directional "to per 1 from" HERE so
  // every downstream value (line, header, tooltip) shares one scale.
  const seriesByDir = useMemo(() => {
    const inRange = <T extends { t: number }>(arr: T[] | undefined) =>
      (arr ?? []).filter((p) => p.t >= lo && p.t <= head);
    const toDirectional = (
      dir: Direction,
      rows: { t: number; rate: number }[],
    ): RateRow[] =>
      rows.map((r) => ({ t: r.t, rate: directionalRateFor(dir, r.rate) ?? 0 }));
    const minerFor = (direction: Direction): RateRow[] => {
      if (!minerHotkey) return [];
      const { from, to } = decomposeDirection(direction);
      return toDirectional(
        direction,
        inRange(minerRates ?? []).filter(
          (r) => r.fromChain === from && r.toChain === to,
        ),
      );
    };
    return ALL_DIRECTIONS.reduce(
      (acc, dir) => {
        acc[dir] = {
          crown: toDirectional(dir, inRange(crownByDir[dir])),
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

  // One bordered card containing all four direction charts, mirroring the
  // Crown Time panel's shape: shared header + chips, direction blocks inside.
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        p: { xs: 2, md: 2.5 },
        mb: 3,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <SectionHeading title={title} subtitle={tagline} />
        <RangeChips
          value={range}
          options={Object.keys(RANGE_SECS) as CrownRange[]}
          onChange={onRangeChange}
        />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          columnGap: 4,
          rowGap: 3,
        }}
      >
        {ALL_DIRECTIONS.map((dir) => {
          const meta = DIRECTION_META[dir];
          const s = seriesByDir[dir];
          const primary = minerMode ? s.miner : s.crown;
          const latest = primary.length
            ? primary[primary.length - 1].rate
            : null;
          const info = minerMode
            ? `This miner's quoted ${meta.label} rate over time; the network's best (crown) rate is dashed for reference.`
            : `Best ${meta.label} rate quoted by any active miner over time.`;
          return (
            <Box key={dir} sx={{ minWidth: 0 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
                sx={{ mb: 1 }}
              >
                <Box>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        color: 'text.primary',
                      }}
                    >
                      {meta.label}
                    </Typography>
                    <Tooltip title={info} arrow enterTouchDelay={0}>
                      <InfoOutlinedIcon
                        sx={{
                          fontSize: '0.85rem',
                          color: 'text.disabled',
                          cursor: 'help',
                          '&:hover': { color: 'text.secondary' },
                        }}
                      />
                    </Tooltip>
                  </Stack>
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.62rem',
                      color: 'text.secondary',
                    }}
                  >
                    {meta.caption}
                  </Typography>
                </Box>
                {latest != null && <LatestRate direction={dir} rate={latest} />}
              </Stack>
              <TimeSeriesChart
                series={chartSeries(dir)}
                height={180}
                formatValue={fmt}
                autoScale
                emptyLabel="no rate history yet"
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default CrownRateChart;
