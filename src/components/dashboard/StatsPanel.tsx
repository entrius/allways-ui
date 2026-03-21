import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { COLORS, FONTS } from '../../theme';

interface DashboardStats {
  totalSwaps: number;
  totalVolumeTao: string;
  activeMiners: number;
  activeSwaps: number;
  averageRate: string | null;
}

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <Box
    sx={{
      p: 2.5,
      borderRadius: 1,
      backgroundColor: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      textAlign: 'center',
    }}
  >
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '1.5rem',
        fontWeight: 700,
        color: COLORS.primary,
        lineHeight: 1.2,
      }}
    >
      {value}
    </Typography>
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.65rem',
        color: COLORS.textMuted,
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
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['stats'],
    queryFn: () => api.get('/stats').then((r) => r.data),
    refetchInterval: 30000,
  });

  if (!stats) return null;

  const volume = parseFloat(stats.totalVolumeTao).toFixed(2);
  const avgRate = stats.averageRate ? parseFloat(stats.averageRate).toFixed(8) : '—';

  return (
    <Grid container spacing={1.5}>
      <Grid item xs={6} sm={3}>
        <StatCard label="Total Swaps" value={stats.totalSwaps} />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard label="Volume (TAO)" value={volume} />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard label="Active Miners" value={stats.activeMiners} />
      </Grid>
      <Grid item xs={6} sm={3}>
        <StatCard label="Active Swaps" value={stats.activeSwaps} />
      </Grid>
    </Grid>
  );
};

export default StatsPanel;
