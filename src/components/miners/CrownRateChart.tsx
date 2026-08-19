import React, { useMemo } from 'react';
import { Box, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  useApiQuery,
  CROWN_REFRESH_MS,
  decomposeDirection,
  directionalRateFor,
  useMinerRateHistory,
  type CrownRateHistoryRow,
  type Direction,
  type RateRange,
} from '../../api';
import { chainSymbol } from '../../utils/format';
import { TimeSeriesChart, type ChartSeries } from '../stats';
import DirectionSelect from './DirectionSelect';
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

// Labels generated from the direction's own legs — nothing chain-specific.
// Every rendered rate is directional "to per 1 from" ("1 {from} = {value}
// {to}"); the series converts the canonical stored values at ingest.
const dirMeta = (dir: Direction) => {
  const { from, to } = decomposeDirection(dir);
  const f = chainSymbol(from);
  const t = chainSymbol(to);
  return { label: `${f} → ${t}`, from: f, to: t, caption: `${t} per 1 ${f}` };
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
  const meta = dirMeta(direction);
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

// One direction per view, picked with the shared DirectionSelect — the same
// treatment as the crown-history grid. The old form rendered a mini-chart
// (and fired a query) per derived direction, which stopped scaling once the
// chain registry passed a handful of pairs.
const CrownRateChart: React.FC<{
  range: CrownRange;
  onRangeChange: (r: CrownRange) => void;
  direction: Direction;
  onDirectionChange: (d: Direction) => void;
  minerHotkey?: string;
}> = ({ range, onRangeChange, direction, onDirectionChange, minerHotkey }) => {
  const theme = useTheme();
  const secs = RANGE_SECS[range];
  const minerMode = !!minerHotkey;
  // Monochrome, matching the Network Stats charts.
  const cLine = theme.palette.text.primary;
  const cReference = theme.palette.text.disabled;

  const { data: crownData } = useApiQuery<CrownRateHistoryRow[]>(
    'crown-rate-history',
    '/crown/rate-history',
    CROWN_REFRESH_MS,
    { direction, seconds: secs },
  );
  const { data: minerRates } = useMinerRateHistory(minerHotkey ?? '');

  // {crown, miner} rows clipped to a shared window anchored on the freshest
  // point of either series. Stored rates are canonical "spoke per 1 hub";
  // convert to directional "to per 1 from" HERE so every downstream value
  // (line, header, tooltip) shares one scale.
  const { crown, miner, latest } = useMemo(() => {
    const { from, to } = decomposeDirection(direction);
    const minerRows = minerMode
      ? (minerRates ?? []).filter(
          (r) => r.fromChain === from && r.toChain === to,
        )
      : [];
    // Use reduce instead of `Math.max(...arr)` to avoid spreading large arrays.
    const maxT = (arr: { t: number }[]) =>
      arr.reduce((m, p) => (p.t > m ? p.t : m), 0);
    const head = Math.max(maxT(crownData ?? []), maxT(minerRows));
    const lo = Math.max(0, head - secs + 1);
    const inRange = <T extends { t: number }>(arr: T[]) =>
      arr.filter((p) => p.t >= lo && p.t <= head);
    const toDirectional = (rows: { t: number; rate: number }[]): RateRow[] =>
      rows.map((r) => ({
        t: r.t,
        rate: directionalRateFor(direction, r.rate) ?? 0,
      }));
    const crownSeries = toDirectional(inRange(crownData ?? []));
    const minerSeries = toDirectional(inRange(minerRows));
    const primary = minerMode ? minerSeries : crownSeries;
    return {
      crown: crownSeries,
      miner: minerSeries,
      latest: primary.length ? primary[primary.length - 1].rate : null,
    };
  }, [crownData, minerRates, minerMode, direction, secs]);

  const meta = dirMeta(direction);
  const points = (rows: RateRow[]) =>
    rows.map((r) => ({ t: r.t * 1000, value: r.rate }));
  const series: ChartSeries[] = minerMode
    ? [
        {
          name: 'miner',
          points: points(miner),
          color: cLine,
          formatValue: fmt,
          unit: meta.to,
        },
        {
          name: 'crown',
          points: points(crown),
          color: cReference,
          formatValue: fmt,
          unit: meta.to,
          dashed: true,
        },
      ]
    : [
        {
          name: 'crown',
          points: points(crown),
          color: cLine,
          formatValue: fmt,
          unit: meta.to,
        },
      ];

  const title = minerMode ? 'Miner Rate' : 'Crown Rate';
  const tagline = minerMode
    ? 'this miner over time · crown shown dashed for reference'
    : 'best rate per direction, over time';
  const info = minerMode
    ? `This miner's quoted ${meta.label} rate over time; the network's best (crown) rate is dashed for reference.`
    : `Best ${meta.label} rate quoted by any active miner over time.`;

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
        sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1.5 }}
      >
        <SectionHeading title={title} subtitle={tagline} />
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          useFlexGap
          flexWrap="wrap"
        >
          <DirectionSelect
            value={direction}
            onChange={(d) => d && onDirectionChange(d)}
            width={168}
          />
          <RangeChips
            value={range}
            options={Object.keys(RANGE_SECS) as CrownRange[]}
            onChange={onRangeChange}
          />
        </Stack>
      </Stack>

      {/* The dropdown already names the direction — this row carries only
          the unit caption and the latest directional rate. */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
        sx={{ mb: 1 }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.62rem',
              color: 'text.secondary',
            }}
          >
            {meta.caption}
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
        {latest != null && <LatestRate direction={direction} rate={latest} />}
      </Stack>
      <TimeSeriesChart
        series={series}
        height={220}
        formatValue={fmt}
        autoScale
        emptyLabel="no rate history yet"
      />
    </Box>
  );
};

export default CrownRateChart;
