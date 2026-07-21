import React, { useMemo } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { useCompleteSwapHistory } from '../../api';
import {
  decomposeDirection,
  directionLabel,
  type Direction,
} from '../../api/models/MinersDashboard';
import { lamportsToSol } from '../../utils/format';
import { FONTS } from '../../theme';

const Item: React.FC<{
  label: string;
  value: React.ReactNode;
  hint: string;
}> = ({ label, value, hint }) => (
  <Tooltip title={hint} arrow placement="top">
    <Stack direction="row" alignItems="baseline" spacing={0.75}>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.6rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'text.primary',
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Stack>
  </Tooltip>
);

// Symbol stats for ONE direction over the hero's selected window, computed
// from the raw swap history so any window works (the /history endpoint only
// serves fixed network-wide buckets). In-flight is a current level, not
// windowed.
const StatsStrip: React.FC<{
  direction: Direction;
  /** Window length in seconds (the hero range). */
  secs: number;
  /** Chip text for labels, e.g. "1D". */
  rangeLabel: string;
  /** No frame — for embedding inside the market hero. */
  bare?: boolean;
}> = ({ direction, secs, rangeLabel, bare }) => {
  const { data: swaps } = useCompleteSwapHistory();
  const { from, to } = decomposeDirection(direction);

  const stats = useMemo(() => {
    const cutoff = Date.now() / 1000 - secs;
    let volume = 0;
    let completed = 0;
    let timedOut = 0;
    let inFlight = 0;
    for (const s of swaps ?? []) {
      if (
        s.sourceChain?.toLowerCase() !== from ||
        s.destChain?.toLowerCase() !== to
      )
        continue;
      if (s.status === 'ACTIVE' || s.status === 'FULFILLED') inFlight += 1;
      if (s.initiatedAt == null || Number(s.initiatedAt) < cutoff) continue;
      if (s.status === 'COMPLETED') {
        completed += 1;
        const v = s.solAmount != null ? lamportsToSol(s.solAmount) : NaN;
        if (Number.isFinite(v)) volume += v;
      } else if (s.status === 'TIMED_OUT') {
        timedOut += 1;
      }
    }
    return {
      volume,
      completed,
      inFlight,
      success:
        completed + timedOut > 0 ? completed / (completed + timedOut) : null,
    };
  }, [swaps, from, to, secs]);

  const fmtVol = (v: number) =>
    v >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : v.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const dir = directionLabel(direction);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: 3,
        rowGap: 0.5,
        ...(bare
          ? {}
          : {
              py: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
            }),
      }}
    >
      <Item
        label={`${rangeLabel} vol`}
        value={`${fmtVol(stats.volume)} SOL`}
        hint={`${dir} volume (SOL side) completed over the selected window.`}
      />
      <Item
        label={`${rangeLabel} txns`}
        value={stats.completed.toLocaleString()}
        hint={`${dir} swaps completed over the selected window.`}
      />
      <Item
        label={`${rangeLabel} success`}
        value={
          stats.success != null ? `${(stats.success * 100).toFixed(1)}%` : '—'
        }
        hint={`Share of ${dir} swaps that completed (vs timed out) over the selected window.`}
      />
      <Item
        label="in flight"
        value={String(stats.inFlight)}
        hint={`${dir} transactions currently in progress.`}
      />
    </Box>
  );
};

export default StatsStrip;
