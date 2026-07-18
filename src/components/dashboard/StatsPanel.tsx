import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useActiveNodeCount, useStats } from '../../api';
import { formatSol } from '../../utils/format';
import { FONTS } from '../../theme';
import { RollingValue } from '../animated';
import { StatsPanelSkeleton } from './Skeletons';

const StatCard: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <Box
    sx={{
      p: 2.5,
      borderRadius: 0,
      backgroundColor: 'surface.light',
      border: '1px solid',
      borderColor: 'divider',
      textAlign: 'center',
    }}
  >
    <Box
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'primary.main',
        lineHeight: 1.2,
      }}
    >
      <RollingValue value={value} />
    </Box>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.65rem',
        color: 'text.secondary',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        mt: 0.5,
      }}
    >
      {label}
    </Typography>
  </Box>
);

const StatsPanel: React.FC = () => {
  const { data: stats, isLoading } = useStats();
  const { count: activeNodes } = useActiveNodeCount();

  const volume = stats ? formatSol(stats.totalVolumeSol) : '0';

  return isLoading || !stats ? (
    <StatsPanelSkeleton />
  ) : (
    <Grid container spacing={1.5}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          label="Successful Transactions"
          value={String(stats.totalSwaps)}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard label="Volume (SOL)" value={volume} />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard label="Active Network Nodes" value={String(activeNodes)} />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          label="Active Transactions"
          value={String(stats.activeSwaps)}
        />
      </Grid>
    </Grid>
  );
};

export default StatsPanel;
