import React, { useMemo } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { useCrownRateHistory, useCurrentCrown } from '../../api';
import {
  decomposeDirection,
  directionalRateFor,
  type Direction,
} from '../../api/models/MinersDashboard';
import { useSpokes } from '../../hooks';
import { formatRate } from '../../utils/format';
import { FONTS } from '../../theme';
import { BlockIndicator, ChainLogo } from '../index';
import Ticker from '../Ticker';
import { MOVE_COLORS } from './AllwaysMarketRate';

const DAY_SECS = 86_400;
const SEGMENT_FONT = { xs: '0.6rem', sm: '0.72rem' } as const;

// One tape segment, broadcast-ticker style: logo, FX symbol, last rate, and
// the 1D move with its ▲/▼ — the same numbers the watchlist carries, in
// crawl form.
const DirSegment: React.FC<{ direction: Direction }> = ({ direction }) => {
  const theme = useTheme();
  const { from, to } = decomposeDirection(direction);

  const { data: crown } = useCurrentCrown();
  const live = directionalRateFor(direction, crown?.[direction]?.rate);
  const { data: rows } = useCrownRateHistory({
    direction,
    secs: DAY_SECS,
  });
  const first = rows?.length
    ? directionalRateFor(direction, rows[0].rate)
    : null;
  const last =
    live ??
    (rows?.length
      ? directionalRateFor(direction, rows[rows.length - 1].rate)
      : null);
  const chg =
    first != null && first !== 0 && last != null
      ? ((last - first) / first) * 100
      : null;

  const move = MOVE_COLORS[theme.palette.mode === 'dark' ? 'dark' : 'light'];
  const chgColor =
    chg == null || chg === 0
      ? theme.palette.text.secondary
      : chg > 0
        ? move.up
        : move.down;

  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <ChainLogo chain={from} size={13} />
      <Typography
        variant="mono"
        sx={{
          fontSize: SEGMENT_FONT,
          color: 'text.secondary',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        {from.toUpperCase()}
        <Box component="span" sx={{ color: 'text.disabled' }}>
          /
        </Box>
        {to.toUpperCase()}
      </Typography>
      <Typography
        variant="mono"
        sx={{
          fontSize: SEGMENT_FONT,
          color: 'text.primary',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {last != null ? formatRate(last) : '—'}
      </Typography>
      {chg != null && (
        <Typography
          variant="mono"
          sx={{
            fontSize: SEGMENT_FONT,
            color: chgColor,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {chg > 0 ? '▲' : chg < 0 ? '▼' : ''} {Math.abs(chg).toFixed(2)}%
        </Typography>
      )}
    </Stack>
  );
};

// Market-page eyebrow: the "updated <ago>" indicator pinned left, then the
// wall-street tape — every route crawling by with its rate and 1D move.
const RatesTicker: React.FC = () => {
  const spokes = useSpokes();
  const directions = useMemo<Direction[]>(
    () =>
      spokes.flatMap((s) => {
        const S = s.toUpperCase();
        return [`SOL-${S}`, `${S}-SOL`] as Direction[];
      }),
    [spokes],
  );

  return (
    <Stack
      direction="row"
      spacing={{ xs: 1.5, sm: 3 }}
      alignItems="center"
      sx={{
        fontFamily: FONTS.mono,
        fontSize: { xs: '0.6rem', sm: '0.72rem' },
        color: 'text.secondary',
        pt: { xs: 1, sm: 1.5 },
        pb: { xs: 1, sm: 1.5 },
        mb: { xs: 1.5, sm: 2 },
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <BlockIndicator />
      </Box>
      <Ticker>
        {directions.map((d) => (
          <DirSegment key={d} direction={d} />
        ))}
      </Ticker>
    </Stack>
  );
};

export default RatesTicker;
