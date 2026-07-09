import React, { useMemo } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { useHistory, useStats } from '../../api';
import { lamportsToSol } from '../../utils/format';
import { FONTS } from '../../theme';

// Thin 24h context strip for the chart column: recent volume, activity, and
// reliability at a glance, from the same /history buckets Network Stats uses.
const Item: React.FC<{ label: string; value: string; hint: string }> = ({
  label,
  value,
  hint,
}) => (
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

const StatsStrip: React.FC = () => {
  const { data: history } = useHistory('24h', 'hour');
  const { data: stats } = useStats();

  const day = useMemo(() => {
    const rows = history ?? [];
    let volume = 0;
    let swaps = 0;
    let weightedSuccess = 0;
    let successWeight = 0;
    for (const r of rows) {
      const v = lamportsToSol(r.volumeSol);
      if (Number.isFinite(v)) volume += v;
      swaps += r.swaps;
      if (r.successRate != null && r.swaps > 0) {
        weightedSuccess += r.successRate * r.swaps;
        successWeight += r.swaps;
      }
    }
    return {
      volume,
      swaps,
      success: successWeight > 0 ? weightedSuccess / successWeight : null,
    };
  }, [history]);

  const fmtVol = (v: number) =>
    v >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : v.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: 3,
        rowGap: 0.5,
        py: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Item
        label="24h vol"
        value={`${fmtVol(day.volume)} SOL`}
        hint="Completed swap volume over the last 24 hours."
      />
      <Item
        label="24h txns"
        value={day.swaps.toLocaleString()}
        hint="Swaps completed over the last 24 hours."
      />
      <Item
        label="24h success"
        value={day.success != null ? `${(day.success * 100).toFixed(1)}%` : '—'}
        hint="Share of swaps that completed (vs timed out) over the last 24 hours."
      />
      <Item
        label="in flight"
        value={stats ? String(stats.activeSwaps) : '—'}
        hint="Transactions currently in progress."
      />
    </Box>
  );
};

export default StatsStrip;
