import React from 'react';
import { Box, Stack, useTheme } from '@mui/material';
import { ALL_DIRECTIONS } from '../../api';
import { FONTS } from '../../theme';
import { MOVE_COLORS } from '../dashboard/AllwaysMarketRate';

// Each direction gets an equal slice of emission — derive the pool share from
// the registry instead of hardcoding it so adding a pair updates the math.
export const POOL_SHARE = 1 / ALL_DIRECTIONS.length;

// The factor fields shared by MinerScoreRow (history) and
// CurrentMinerScoreRow (live tip) — everything but the timestamp key.
export type ScoreFactorsRow = {
  eligible: boolean;
  crownShare: number;
  capacity: number;
  reward: number;
};

// ApiUtils parses any JSON number that would lose precision as a string —
// long floats (>15 chars) included — so coerce before calling Number methods.
export const fmtReward = (raw: number): string => {
  const n = Number(raw);
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 0.01) return n.toFixed(3);
  if (abs >= 0.0001) return n.toFixed(4);
  return n.toExponential(1);
};

const f2 = (n: number) => Number(n).toFixed(2);

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box component="span" sx={{ color: 'text.disabled' }}>
    {children}
  </Box>
);

const Val: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box component="span" sx={{ color: 'text.primary' }}>
    {children}
  </Box>
);

// The one place the reward multiplication is written out with real values —
// used by the scoring panel's live tip, its chart popover, and the crown
// history panel's per-round readout.
const ScoreBreakdown: React.FC<{
  row: ScoreFactorsRow;
  label?: string;
}> = ({ row, label }) => {
  const theme = useTheme();
  const pool = f2(POOL_SHARE);
  return (
    <Stack
      direction="row"
      alignItems="baseline"
      spacing={1.25}
      sx={{ flexWrap: 'wrap' }}
    >
      {label && (
        <Box
          component="span"
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.65rem',
            color: 'text.secondary',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Box>
      )}
      <Box
        component="span"
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          lineHeight: 1.8,
          color: 'text.secondary',
        }}
      >
        <Muted>eligible(</Muted>
        <Box
          component="span"
          sx={{
            color: row.eligible
              ? MOVE_COLORS[theme.palette.mode].up
              : 'text.disabled',
          }}
        >
          {row.eligible ? '✓' : '✗'}
        </Box>
        <Muted>{') × '}</Muted>
        <Muted>{pool}</Muted>
        <Muted>{' × crown '}</Muted>
        <Val>{f2(row.crownShare)}</Val>
        <Muted>{' × cap '}</Muted>
        <Val>{f2(row.capacity)}</Val>
        <Muted>{' = '}</Muted>
        <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
          {fmtReward(row.reward)}
        </Box>
      </Box>
    </Stack>
  );
};

export default ScoreBreakdown;
