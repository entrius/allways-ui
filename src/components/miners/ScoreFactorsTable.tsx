import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { FONTS } from '../../theme';
import { MOVE_COLORS } from '../dashboard/AllwaysMarketRate';
import { fmtReward, type ScoreFactorsRow } from './ScoreBreakdown';

export type FactorTableRow = ScoreFactorsRow & {
  key: string;
  label: string;
};

const f2 = (n: number) => Number(n).toFixed(2);

// Dense columnar twin of ScoreBreakdown: same factors, one aligned row per
// lane instead of formula prose — the panel-body form (the written-out
// multiplication stays in the chart popover). Below `sm` the pool/cap columns
// drop so phones read lane · eligibility · reward.
const ScoreFactorsTable: React.FC<{
  rows: FactorTableRow[];
  // What the label column holds — "lane" (scoring tip) or "round" (crown
  // history's per-round times).
  labelHeader?: string;
}> = ({ rows, labelHeader = 'lane' }) => {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const up = MOVE_COLORS[theme.palette.mode].up;
  const cols = compact ? 4 : 6;

  const cellSx = {
    py: 0.5,
    borderBottom: '1px solid',
    borderColor: 'divider',
    fontFamily: FONTS.mono,
    fontSize: compact ? '0.7rem' : '0.75rem',
    color: 'text.primary',
    whiteSpace: 'nowrap',
  } as const;
  const headSx = {
    ...cellSx,
    fontSize: '0.58rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'text.disabled',
  } as const;
  const numSx = { ...cellSx, textAlign: 'right' } as const;

  return (
    <Box sx={{ minWidth: 0, overflowX: 'auto' }}>
      <Box
        sx={{
          display: 'grid',
          // Intrinsic width: the table hugs its content instead of smearing
          // a lane/number gap across a wide panel; the wrapper scrolls when
          // the viewport is narrower than the table.
          width: 'max-content',
          gridTemplateColumns: `repeat(${cols}, max-content)`,
          columnGap: { xs: 1.5, md: 3 },
          alignItems: 'baseline',
          [`& > *:nth-last-of-type(-n+${cols})`]: { borderBottom: 0 },
        }}
      >
        <Box sx={headSx}>{labelHeader}</Box>
        <Box sx={{ ...headSx, textAlign: 'center' }}>elig</Box>
        {!compact && <Box sx={{ ...headSx, textAlign: 'right' }}>pool</Box>}
        <Box sx={{ ...headSx, textAlign: 'right' }}>crown</Box>
        {!compact && <Box sx={{ ...headSx, textAlign: 'right' }}>cap</Box>}
        <Box sx={{ ...headSx, textAlign: 'right' }}>reward</Box>
        {rows.map((row) => (
          <React.Fragment key={row.key}>
            <Box
              sx={{
                ...cellSx,
                fontSize: compact ? '0.66rem' : '0.7rem',
                color: 'text.secondary',
                letterSpacing: '0.04em',
              }}
            >
              {row.label}
            </Box>
            <Box
              sx={{
                ...cellSx,
                textAlign: 'center',
                color: row.eligible ? up : 'text.disabled',
              }}
            >
              {row.eligible ? '✓' : '✗'}
            </Box>
            {!compact && (
              /* Pool is volume-weighted per round and always row-sourced;
                 '—' = a round scored before the validator recorded it. */
              <Box sx={{ ...numSx, color: 'text.secondary' }}>
                {row.pool == null ? '—' : f2(row.pool)}
              </Box>
            )}
            <Box sx={{ ...numSx, color: 'text.secondary' }}>
              {f2(row.crownShare)}
            </Box>
            {!compact && (
              <Box sx={{ ...numSx, color: 'text.secondary' }}>
                {f2(row.capacity)}
              </Box>
            )}
            <Box sx={{ ...numSx, fontWeight: 600 }}>
              {fmtReward(row.reward)}
            </Box>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

export default ScoreFactorsTable;
