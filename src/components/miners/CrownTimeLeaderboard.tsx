import React, { useState } from 'react';
import {
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { useCrownTime } from '../../api';
import {
  ALL_DIRECTIONS,
  directionLabel,
} from '../../api/models/MinersDashboard';
import type { CrownTimeRow, Direction } from '../../api/models';
import { shortHotkey } from '../../utils/format';
import { FONTS } from '../../theme';

// Crown time is a step function that only changes on events, so we measure it
// as real duration held (seconds) on the unix axis — not a count of 12s ticks.
// This panel is the time-native replacement for the old per-cell crown grid.

type RangeKey = '1h' | '4h' | '24h' | '4d';

const RANGES: { key: RangeKey; secs: number }[] = [
  { key: '1h', secs: 3600 },
  { key: '4h', secs: 14_400 },
  { key: '24h', secs: 86_400 },
  { key: '4d', secs: 345_600 },
];

const fmtDuration = (secs: number): string => {
  const s = Math.max(0, Math.round(secs));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
};

const HolderRow: React.FC<{ row: CrownTimeRow }> = ({ row }) => {
  const pct = Math.min(100, Math.max(0, row.shareOfWindow * 100));
  const who = row.uid != null ? `uid ${row.uid}` : shortHotkey(row.hotkey);
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '4.5rem 1fr 4.5rem',
        alignItems: 'center',
        gap: 1,
        py: 0.5,
      }}
    >
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.72rem',
          color: 'text.primary',
        }}
        title={row.hotkey}
      >
        {who}
      </Typography>
      <Box sx={{ position: 'relative', height: 16, minWidth: 0 }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'action.hover',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            // Monochrome like the Network Stats pair-mix bars.
            width: `${pct}%`,
            backgroundColor: 'text.primary',
            opacity: 0.85,
          }}
        />
        <Typography
          sx={{
            position: 'absolute',
            left: 6,
            top: 0,
            lineHeight: '16px',
            fontFamily: FONTS.mono,
            fontSize: '0.62rem',
            // White + difference blend stays readable over both the dark bar
            // and the light track, in both themes.
            color: '#fff',
            mixBlendMode: 'difference',
          }}
        >
          {fmtDuration(row.crownSecs)}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.72rem',
          color: 'text.secondary',
          textAlign: 'right',
        }}
      >
        {pct.toFixed(1)}%
      </Typography>
    </Box>
  );
};

const DirectionColumn: React.FC<{
  direction: Direction;
  seconds: number;
}> = ({ direction, seconds }) => {
  const { data } = useCrownTime({ direction, seconds });
  const holders = data?.holders ?? [];

  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: 'text.primary',
          mb: 1,
        }}
      >
        {directionLabel(direction)}
      </Typography>
      {holders.length === 0 ? (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.68rem',
            color: 'text.disabled',
            py: 2,
          }}
        >
          no crown activity in this window
        </Typography>
      ) : (
        <Stack>
          {holders.map((h) => (
            <HolderRow key={h.hotkey} row={h} />
          ))}
        </Stack>
      )}
    </Box>
  );
};

const CrownTimeLeaderboard: React.FC = () => {
  const theme = useTheme();
  const [range, setRange] = useState<RangeKey>('1h');
  const seconds = RANGES.find((r) => r.key === range)?.secs ?? 3600;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        p: { xs: 2, md: 2.5 },
        mt: 2,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'text.primary',
            }}
          >
            Crown Time
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.62rem',
              color: 'text.secondary',
            }}
          >
            time each miner held the best rate · share of window
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={range}
          onChange={(_, v) => v && setRange(v)}
          sx={{
            '& .MuiToggleButton-root': {
              fontFamily: FONTS.mono,
              fontSize: '0.62rem',
              py: 0.25,
              px: 1,
              color: theme.palette.text.secondary,
            },
          }}
        >
          {RANGES.map((r) => (
            <ToggleButton key={r.key} value={r.key}>
              {r.key}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          columnGap: 4,
          rowGap: 3,
        }}
      >
        {ALL_DIRECTIONS.map((dir) => (
          <DirectionColumn key={dir} direction={dir} seconds={seconds} />
        ))}
      </Box>
    </Box>
  );
};

export default CrownTimeLeaderboard;
