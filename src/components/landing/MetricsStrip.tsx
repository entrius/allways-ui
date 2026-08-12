import React from 'react';
import { Box, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { useActiveNodeCount, useStats } from '../../api';
import { backingEntries, chainSymbol } from '../../utils/format';
import { FONTS } from '../../theme';
import { CountUpValue } from '../animated';

interface MetricProps {
  label: string;
  value: string;
  loading?: boolean;
  unit?: string;
  // Multi-denomination readout ("12.34 SOL + 5.00 TAO") — used instead of
  // value/unit when a stat is a per-backing map. Entries are never summed.
  segments?: { value: string; unit: string }[];
}

const Metric: React.FC<MetricProps> = ({
  label,
  value,
  loading,
  unit,
  segments,
}) => (
  <Stack
    sx={{
      p: { xs: 2.5, md: 3 },
      borderRadius: 0,
      borderLeft: { xs: 'none', sm: '1px solid' },
      borderTop: { xs: '1px solid', sm: 'none' },
      borderColor: { xs: 'divider', sm: 'divider' },
      backgroundColor: 'transparent',
      height: '100%',
      justifyContent: 'space-between',
      gap: 1.5,
      '&:first-of-type': {
        borderLeft: 'none',
        borderTop: 'none',
      },
    }}
  >
    <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
    <Box
      sx={{
        fontFamily: FONTS.mono,
        fontSize: { xs: '2rem', md: '2.75rem' },
        fontWeight: 700,
        lineHeight: 1,
        color: 'text.primary',
        minHeight: '1em',
        display: 'flex',
        alignItems: 'baseline',
        gap: 0.5,
      }}
    >
      {loading ? (
        <Skeleton
          variant="rectangular"
          width={140}
          height={36}
          sx={{ bgcolor: 'action.hover' }}
        />
      ) : (
        (segments ?? [{ value, unit }]).map((seg, i) => (
          <React.Fragment key={seg.unit ?? i}>
            {i > 0 && (
              <Box
                component="span"
                sx={{
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  color: 'text.disabled',
                  fontWeight: 500,
                }}
              >
                +
              </Box>
            )}
            <CountUpValue value={seg.value} />
            {seg.unit && (
              <Box
                component="span"
                sx={{
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  color: 'text.secondary',
                  fontWeight: 500,
                }}
              >
                {seg.unit}
              </Box>
            )}
          </React.Fragment>
        ))
      )}
    </Box>
  </Stack>
);

const MetricsStrip: React.FC = () => {
  const { data: stats, isLoading } = useStats();
  const { count: activeNodes, isLoading: nodesLoading } = useActiveNodeCount();
  // Per-backing volume, two columns ("X SOL + Y TAO") — never summed. Falls
  // back to the legacy SOL scalar on an older das.
  const volumeSegs = stats
    ? backingEntries(stats.totalVolumeByBacking, stats.totalVolumeSol).map(
        (e) => ({ value: e.amount, unit: chainSymbol(e.chain) }),
      )
    : [{ value: '0', unit: 'SOL' }];

  return (
    <Box
      sx={{
        width: '100%',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.default',
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Grid container>
          <Grid item xs={12} sm={6} md={3}>
            <Metric
              label="Successful Transactions"
              value={String(stats?.totalSwaps ?? 0)}
              loading={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Metric
              label="Volume"
              value=""
              segments={volumeSegs}
              loading={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Metric
              label="Active Network Nodes"
              value={String(activeNodes)}
              loading={nodesLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Metric
              label="Active Transactions"
              value={String(stats?.activeSwaps ?? 0)}
              loading={isLoading}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default MetricsStrip;
