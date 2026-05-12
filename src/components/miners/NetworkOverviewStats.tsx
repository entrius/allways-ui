import React from 'react';
import { Box, Typography } from '@mui/material';
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
      height: '100%',
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

/**
 * 4-up network stat tiles. Border lines come from each tile's right/bottom
 * border (not a parent-bg-as-divider trick) so a shorter tile never reveals
 * a grey strip beneath the row.
 */
const NetworkOverviewStats: React.FC<{ range?: Range }> = ({ range = '30d' }) => {
  const { data } = useNetworkOverview(range);

  const volume = data?.volumeTao ? parseFloat(data.volumeTao).toFixed(1) : '—';
  const swaps = data?.totalSwaps != null ? data.totalSwaps.toLocaleString() : '—';
  const successPct =
    data?.networkSuccessRate != null ? (data.networkSuccessRate * 100).toFixed(1) : '—';
  const activeMiners = data?.activeMiners != null ? `${data.activeMiners}` : '—';
  const registeredMiners =
    data?.registeredMiners != null ? `of ${data.registeredMiners} reg` : '';
  const pairMix = data?.pairMix?.slice(0, 2) ?? [];
  const pairValue = pairMix.length
    ? pairMix.map((p) => Math.round(p.pct)).join(' / ')
    : '—';
  const pairSub = pairMix.length ? pairMix.map((p) => p.pair).join(' / ') : 'BTC→TAO / TAO→BTC';

  const tiles: Tile[] = [
    { label: `Volume ${range}`, value: volume, sub: 'TAO' },
    { label: `Swaps ${range}`, value: swaps, sub: `${successPct}% success` },
    { label: 'Active miners', value: activeMiners, sub: registeredMiners },
    { label: `Pair mix ${range}`, value: pairValue, sub: pairSub },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        border: '1px solid',
        borderColor: 'divider',
        my: 2,
        '& > *': {
          borderRight: { sm: '1px solid' },
          borderBottom: { xs: '1px solid', md: 'none' },
          borderColor: 'divider',
        },
        // last cell in each row should not show a right border; bottom row
        // shouldn't show a bottom border.
        '& > *:nth-of-type(2n)': { borderRight: { sm: 'none', md: '1px solid' } },
        '& > *:nth-of-type(4n)': { borderRight: { md: 'none' } },
        '& > *:last-of-type': { borderBottom: 'none', borderRight: 'none' },
        '& > *:nth-last-of-type(2)': { borderBottom: { md: 'none' } },
      }}
    >
      {tiles.map((t) => (
        <StatTile key={t.label} tile={t} />
      ))}
    </Box>
  );
};

export default NetworkOverviewStats;
