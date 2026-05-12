import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useNetworkOverview, type Range } from '../../api';
import { FONTS } from '../../theme';

interface Tile {
  label: string;
  value: string;
  sub: string;
}

const StatTile: React.FC<{ tile: Tile }> = ({ tile }) => (
  <Box
    sx={{
      backgroundColor: 'surface.light',
      px: 2.5,
      py: 2,
    }}
  >
    <Typography
      variant="monoSmall"
      sx={{
        fontSize: '0.6rem',
        letterSpacing: '0.22em',
        color: 'text.secondary',
        mb: 1,
      }}
    >
      {tile.label}
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '1.6rem',
        fontWeight: 500,
        lineHeight: 1,
      }}
    >
      {tile.value}
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.72rem',
        color: 'text.disabled',
        mt: 0.75,
      }}
    >
      {tile.sub}
    </Typography>
  </Box>
);

const NetworkOverviewStats: React.FC<{ range?: Range }> = ({
  range = '30d',
}) => {
  const { data } = useNetworkOverview(range);

  const volume = data?.volumeTao ? parseFloat(data.volumeTao).toFixed(1) : '—';
  const swaps =
    data?.totalSwaps != null ? data.totalSwaps.toLocaleString() : '—';
  const successPct =
    data?.networkSuccessRate != null
      ? (data.networkSuccessRate * 100).toFixed(1)
      : '—';
  const activeMiners =
    data?.activeMiners != null ? `${data.activeMiners}` : '—';
  const registeredMiners =
    data?.registeredMiners != null ? `of ${data.registeredMiners} reg` : '';
  const pairMix = data?.pairMix?.slice(0, 2) ?? [];
  const pairValue = pairMix.length
    ? pairMix.map((p) => Math.round(p.pct)).join(' / ')
    : '—';
  const pairSub = pairMix.length
    ? pairMix.map((p) => p.pair).join(' / ')
    : 'BTC→TAO / TAO→BTC';

  const tiles: Tile[] = [
    { label: `Volume ${range}`, value: volume, sub: 'TAO' },
    { label: `Swaps ${range}`, value: swaps, sub: `${successPct}% success` },
    { label: 'Active miners', value: activeMiners, sub: registeredMiners },
    { label: `Pair mix ${range}`, value: pairValue, sub: pairSub },
  ];

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{
        gap: '1px',
        backgroundColor: 'divider',
        border: '1px solid',
        borderColor: 'divider',
        my: 2,
      }}
    >
      {tiles.map((t) => (
        <Box key={t.label} sx={{ flex: 1, minWidth: 0 }}>
          <StatTile tile={t} />
        </Box>
      ))}
    </Stack>
  );
};

export default NetworkOverviewStats;
