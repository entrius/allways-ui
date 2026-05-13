import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useNetworkOverview, type Range, type PairMix } from '../../api';
import { FONTS } from '../../theme';

interface Tile {
  label: string;
  body: React.ReactNode;
}

const TileValue: React.FC<{ value: string; suffix?: React.ReactNode }> = ({
  value,
  suffix,
}) => (
  <Stack direction="row" alignItems="baseline" spacing={0.75}>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '1.6rem',
        fontWeight: 500,
        lineHeight: 1,
      }}
    >
      {value}
    </Typography>
    {suffix && (
      <Box
        sx={{
          fontFamily: FONTS.mono,
          color: 'text.disabled',
          lineHeight: 1,
        }}
      >
        {suffix}
      </Box>
    )}
  </Stack>
);

const formatPair = (raw: string): string => raw.replace('-', '→');

const DirectionBars: React.FC<{ segments: PairMix[] }> = ({ segments }) => {
  const total = segments.reduce((sum, s) => sum + s.pct, 0) || 1;
  return (
    <Stack spacing={0.6} sx={{ mt: 0.25 }}>
      {segments.map((s) => {
        const pct = (s.pct / total) * 100;
        return (
          <Stack
            key={s.pair}
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}
          >
            <Box
              component="span"
              sx={{
                color: 'text.secondary',
                minWidth: 60,
              }}
            >
              {formatPair(s.pair)}
            </Box>
            <Box
              sx={{
                flex: 1,
                height: 6,
                backgroundColor: 'rgba(255,255,255,0.06)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  backgroundColor: 'primary.main',
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
            <Box
              component="span"
              sx={{ color: 'text.primary', minWidth: 28, textAlign: 'right' }}
            >
              {Math.round(s.pct)}%
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
};

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
    {tile.body}
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
      ? (data.networkSuccessRate * 100).toFixed(0)
      : null;
  const activeMiners =
    data?.activeMiners != null ? `${data.activeMiners}` : '—';
  const pairMix = data?.pairMix?.slice(0, 2) ?? [];

  const tiles: Tile[] = [
    {
      label: `Volume ${range}`,
      body: (
        <TileValue
          value={volume}
          suffix={
            <Box component="span" sx={{ fontSize: '1.1rem', lineHeight: 1 }}>
              τ
            </Box>
          }
        />
      ),
    },
    {
      label: `Swaps ${range}`,
      body: (
        <TileValue
          value={swaps}
          suffix={
            successPct != null ? (
              <Box component="span" sx={{ fontSize: '0.72rem' }}>
                · {successPct}% success
              </Box>
            ) : undefined
          }
        />
      ),
    },
    {
      label: 'Active miners',
      body: <TileValue value={activeMiners} />,
    },
    {
      label: `Swap directions ${range}`,
      body:
        pairMix.length > 0 ? (
          <DirectionBars segments={pairMix} />
        ) : (
          <TileValue value="—" />
        ),
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(4, 1fr)',
        },
        border: '1px solid',
        borderColor: 'divider',
        my: 2,
        '& > *': {
          borderRight: { sm: '1px solid' },
          borderBottom: { xs: '1px solid', md: 'none' },
          borderColor: 'divider',
        },
        '& > *:nth-of-type(2n)': {
          borderRight: { sm: 'none', md: '1px solid' },
        },
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
