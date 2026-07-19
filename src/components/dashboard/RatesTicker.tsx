import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useCurrentCrown } from '../../api';
import {
  directionalRateFor,
  type CurrentCrown,
  type Direction,
} from '../../api/models/MinersDashboard';
import { formatRate } from '../../utils/format';
import { FONTS } from '../../theme';
import { BlockIndicator } from '../index';
import Ticker from '../Ticker';

// Both legs of each pair, forward first — the strip shows a whole pair at
// once instead of making the reader mentally invert one leg.
const PAIRS: { legs: [Direction, Direction] }[] = [
  { legs: ['SOL-BTC', 'BTC-SOL'] },
  { legs: ['SOL-TAO', 'TAO-SOL'] },
];

const SEGMENT_FONT = { xs: '0.6rem', sm: '0.72rem' } as const;

// "1 SOL → 0.00096608 BTC · uid 236" — the crown rate spelled out as what 1
// unit sent buys, so the reader never has to work out which side of a
// "BTC/SOL" unit is the 1.
const LegQuote: React.FC<{
  direction: Direction;
  holder: CurrentCrown | null | undefined;
}> = ({ direction, holder }) => {
  const [from, to] = direction.split('-');
  const rate = directionalRateFor(direction, holder?.rate);

  return (
    <Typography variant="mono" sx={{ fontSize: SEGMENT_FONT }}>
      <Box component="span" sx={{ color: 'text.secondary' }}>
        1 {from}
      </Box>
      <Box component="span" sx={{ mx: 0.5, color: 'text.disabled' }}>
        →
      </Box>
      {rate != null ? (
        <>
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>
            {formatRate(rate)} {to}
          </Box>
          {holder?.uid != null && (
            <Box component="span" sx={{ ml: 0.75, color: 'text.disabled' }}>
              UID {holder.uid}
            </Box>
          )}
        </>
      ) : (
        <Box component="span" sx={{ color: 'text.disabled' }}>
          no crown
        </Box>
      )}
    </Typography>
  );
};

// One pair group: "👑 SOL ⇄ BTC  1 SOL → x BTC · 1 BTC → y SOL" — both
// directions visible at the same time.
const PairSegment: React.FC<{
  legs: [Direction, Direction];
  crown: Record<Direction, CurrentCrown> | undefined;
}> = ({ legs, crown }) => {
  const [, spoke] = legs[0].split('-');
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ color: 'text.secondary' }}
    >
      <Typography
        variant="mono"
        sx={{
          fontSize: SEGMENT_FONT,
          fontFamily: FONTS.mono,
          letterSpacing: '0.04em',
        }}
      >
        SOL
        <Box component="span" sx={{ mx: 0.5, color: 'text.disabled' }}>
          ⇄
        </Box>
        {spoke}
      </Typography>
      {legs.map((dir, i) => (
        <React.Fragment key={dir}>
          {i > 0 && (
            <Box component="span" sx={{ color: 'text.disabled' }}>
              ·
            </Box>
          )}
          <LegQuote direction={dir} holder={crown?.[dir]} />
        </React.Fragment>
      ))}
    </Stack>
  );
};

// Dashboard eyebrow: the "updated <ago>" indicator plus the live crown rates,
// grouped per pair with both directions shown at once and rates phrased as
// "1 <from> → <rate> <to>".
const RatesTicker: React.FC = () => {
  const { data: crown } = useCurrentCrown();

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0.5, sm: 3 }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      sx={{
        fontFamily: FONTS.mono,
        fontSize: { xs: '0.6rem', sm: '0.72rem' },
        color: 'text.secondary',
        flexWrap: 'wrap',
        gap: { xs: 0.5, sm: 2 },
        rowGap: { xs: 0.5, sm: 1 },
        pt: { xs: 1, sm: 1.5 },
        pb: { xs: 1, sm: 1.5 },
        mb: { xs: 1.5, sm: 2 },
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <BlockIndicator />
      <Ticker>
        {PAIRS.map((p) => (
          <PairSegment key={p.legs[0]} legs={p.legs} crown={crown} />
        ))}
      </Ticker>
    </Stack>
  );
};

export default RatesTicker;
