import React from 'react';
import { Typography } from '@mui/material';

// Mirrors allways/constants.py SCORING_WINDOW_BLOCKS — the validator
// flushes crown rows to the dashboard DB once per round, so panels that
// read crown_holders / rate_history won't show new data between flushes.
// (The top-bar current-crown widget is live ~12s — see current_crown_holders.)
const SCORING_WINDOW_BLOCKS = 600;

interface Props {
  // Current chain head. When null/0 the note renders without the
  // last/next refresh figures.
  headBlock?: number | null;
  // What this panel actually shows ("crown data", "rate history",
  // "crown share"...). Goes at the start of the sentence.
  subject?: string;
  sx?: object;
}

const CrownRoundFillNote: React.FC<Props> = ({
  headBlock,
  subject = 'crown data',
  sx,
}) => {
  const head = headBlock ?? 0;
  const lastRefresh =
    head > 0
      ? Math.floor(head / SCORING_WINDOW_BLOCKS) * SCORING_WINDOW_BLOCKS
      : null;
  const nextRefresh =
    lastRefresh != null ? lastRefresh + SCORING_WINDOW_BLOCKS : null;
  const blocksLeft =
    nextRefresh != null ? Math.max(0, nextRefresh - head) : null;

  return (
    <Typography
      component="div"
      variant="mono"
      sx={{
        fontSize: '0.58rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'text.disabled',
        ...sx,
      }}
    >
      {subject} refreshes at end of each ~2h scoring round
      {lastRefresh != null && (
        <>
          {' · last refresh #'}
          {lastRefresh.toLocaleString()}
          {' · next ~'}
          {blocksLeft}
          {' blocks'}
        </>
      )}
    </Typography>
  );
};

export default CrownRoundFillNote;
