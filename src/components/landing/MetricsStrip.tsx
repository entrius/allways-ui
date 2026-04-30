import React from 'react';
import { Box, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { useStats } from '../../api';
import { FONTS } from '../../theme';
import { CountUpValue } from '../animated';

interface MetricProps {
  label: string;
  value: string;
  loading?: boolean;
}

const Metric: React.FC<MetricProps> = ({ label, value, loading }) => (
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
        <CountUpValue value={value} />
      )}
    </Box>
  </Stack>
);

const MetricsStrip: React.FC = () => {
  const { data: stats, isLoading } = useStats();
  const volume = stats ? parseFloat(stats.totalVolumeTao).toFixed(2) : '0';

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
            <Metric label="Volume (TAO)" value={volume} loading={isLoading} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Metric
              label="Active Network Nodes"
              value={String(stats?.activeMiners ?? 0)}
              loading={isLoading}
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
