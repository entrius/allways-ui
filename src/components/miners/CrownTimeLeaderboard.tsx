import React, { useState } from 'react';
import { Box, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { useQueries } from '@tanstack/react-query';
import { apiQueryOptions, CROWN_REFRESH_MS, useDirections } from '../../api';
import { directionLabel } from '../../api/models/MinersDashboard';
import type {
  CrownTimeRow,
  CrownTimeWindow,
  Direction,
} from '../../api/models';
import { shortHotkey } from '../../utils/format';
import { FONTS } from '../../theme';
import RangeChips from '../RangeChips';
import SectionHeading from '../SectionHeading';

// Crown time is a step function that only changes on events, so we measure it
// as real duration held (seconds) on the unix axis — not a count of 12s ticks.
// This panel is the time-native replacement for the old per-cell crown grid.

// The leaderboard's lookback set, so the whole page shares one range
// vocabulary. Crown time reads crown_holders, which alw-utils prunes at ~4d —
// 7d/30d windows render the data that exists.
type RangeKey = '1h' | '24h' | '7d' | '30d';

const RANGES: { key: RangeKey; secs: number }[] = [
  { key: '1h', secs: 3600 },
  { key: '24h', secs: 86_400 },
  { key: '7d', secs: 604_800 },
  { key: '30d', secs: 2_592_000 },
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
  holders: CrownTimeRow[];
}> = ({ direction, holders }) => (
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
    <Stack>
      {holders.map((h) => (
        <HolderRow key={h.hotkey} row={h} />
      ))}
    </Stack>
  </Box>
);

const ColumnSkeleton: React.FC = () => (
  <Box sx={{ flex: 1, minWidth: 0 }}>
    <Skeleton variant="text" width={72} height={16} sx={{ borderRadius: 0 }} />
    {[0, 1].map((i) => (
      <Box
        key={i}
        sx={{
          display: 'grid',
          gridTemplateColumns: '4.5rem 1fr 4.5rem',
          alignItems: 'center',
          gap: 1,
          py: 0.5,
        }}
      >
        <Skeleton variant="text" width={48} sx={{ borderRadius: 0 }} />
        <Skeleton variant="rectangular" height={16} sx={{ borderRadius: 0 }} />
        <Skeleton variant="text" width={36} sx={{ borderRadius: 0 }} />
      </Box>
    ))}
  </Box>
);

const CrownTimeLeaderboard: React.FC<{
  /** Cap the direction grid at this height and scroll it internally. For
   * surfaces that stack this panel with others (the network page) and can't
   * give one panel thousands of pixels of the page's scroll. */
  maxBodyHeight?: number;
}> = ({ maxBodyHeight }) => {
  const directions = useDirections();
  const [range, setRange] = useState<RangeKey>('1h');
  const seconds = RANGES.find((r) => r.key === range)?.secs ?? 3600;

  // Hoisted per-direction queries (the columns used to fetch for themselves)
  // so the panel can render ONLY directions with activity — with a direction
  // pair per registry spoke, a column per direction was mostly a wall of
  // "no crown activity" placeholders.
  const windows = useQueries({
    queries: directions.map((direction) =>
      apiQueryOptions<CrownTimeWindow>(
        'crown-time',
        '/crown/time',
        CROWN_REFRESH_MS,
        { direction, seconds },
      ),
    ),
    combine: (results) =>
      results.map((r) => ({ data: r.data, isPending: r.isPending })),
  });
  const active = directions.filter(
    (_, i) => (windows[i]?.data?.holders?.length ?? 0) > 0,
  );
  const quiet = directions.filter(
    (_, i) =>
      windows[i]?.data != null && (windows[i].data?.holders?.length ?? 0) === 0,
  );
  const loading =
    windows.length > 0 && windows.every((w) => w.isPending) && !active.length;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        p: { xs: 2, md: 2.5 },
        mt: 2,
        mb: 3,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <SectionHeading
          title="Crown Time"
          subtitle="time each miner held the best rate · share of window"
        />
        <RangeChips
          value={range}
          options={RANGES.map((r) => r.key)}
          onChange={setRange}
        />
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          columnGap: 4,
          rowGap: 3,
          ...(maxBodyHeight
            ? { maxHeight: maxBodyHeight, overflowY: 'auto', pr: 1 }
            : {}),
        }}
      >
        {loading
          ? [0, 1, 2, 3].map((i) => <ColumnSkeleton key={i} />)
          : active.map((dir) => (
              <DirectionColumn
                key={dir}
                direction={dir}
                holders={windows[directions.indexOf(dir)]?.data?.holders ?? []}
              />
            ))}
      </Box>
      {!loading && active.length === 0 && (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            color: 'text.disabled',
            py: 1,
          }}
        >
          no crown activity in this window
        </Typography>
      )}
      {/* Inactive directions fold into one line — hover for which. */}
      {!loading && active.length > 0 && quiet.length > 0 && (
        <Tooltip
          title={quiet.map(directionLabel).join(' · ')}
          placement="top-start"
        >
          <Typography
            sx={{
              mt: 2.5,
              fontFamily: FONTS.mono,
              fontSize: '0.62rem',
              letterSpacing: '0.04em',
              color: 'text.disabled',
              width: 'fit-content',
              cursor: 'help',
            }}
          >
            no crown activity · {quiet.length} other direction
            {quiet.length === 1 ? '' : 's'}
          </Typography>
        </Tooltip>
      )}
    </Box>
  );
};

export default CrownTimeLeaderboard;
