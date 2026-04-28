import React, { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';
import { FONTS } from '../../theme';
import {
  useStats,
  useMiners,
  useActiveSwaps,
  useLatestEvents,
} from '../../api';
import HoverCard from '../HoverCard';

const SnapshotDownload: React.FC = () => {
  const { data: stats } = useStats();
  const { data: miners } = useMiners();
  const { data: activeSwaps } = useActiveSwaps();
  const { data: events } = useLatestEvents();
  const [downloaded, setDownloaded] = useState(false);

  const onDownload = (): void => {
    const snapshot = {
      generatedAt: new Date().toISOString(),
      source: typeof window !== 'undefined' ? window.location.origin : '',
      stats: stats ?? null,
      miners: miners ?? [],
      activeSwaps: activeSwaps ?? [],
      recentEvents: events ?? [],
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allways-snapshot-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1500);
  };

  return (
    <HoverCard sx={{ backgroundColor: 'surface.light' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ p: { xs: 2.5, md: 3 } }}
      >
        <Stack sx={{ flex: 1 }} spacing={0.5}>
          <Typography variant="eyebrow" sx={{ letterSpacing: '0.15em' }}>
            Live state snapshot
          </Typography>
          <Typography
            variant="display"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.05rem', md: '1.15rem' },
              letterSpacing: '-0.01em',
            }}
          >
            Download a JSON of the network right now.
          </Typography>
          <Typography
            sx={{
              fontFamily: FONTS.body,
              fontSize: '0.85rem',
              color: 'text.secondary',
            }}
          >
            Stats, miners, active swaps, and recent events in one file. Skip
            four API calls in your agent's bootstrap.
          </Typography>
        </Stack>
        <Box>
          <Button
            variant="outlined"
            onClick={onDownload}
            startIcon={
              downloaded ? (
                <CheckIcon sx={{ fontSize: 16 }} />
              ) : (
                <DownloadIcon sx={{ fontSize: 16 }} />
              )
            }
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              borderRadius: 0,
              py: 1.25,
              px: 2.5,
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
                backgroundColor: 'transparent',
              },
            }}
          >
            {downloaded ? 'Downloaded' : 'Download snapshot'}
          </Button>
        </Box>
      </Stack>
    </HoverCard>
  );
};

export default SnapshotDownload;
