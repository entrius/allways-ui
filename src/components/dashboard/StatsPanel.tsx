import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useActiveNodeCount, useStats, useUsdPrices } from '../../api';
import {
  backingEntries,
  backingTooltip,
  chainSymbol,
  formatUsd,
  usdFromBackingMap,
} from '../../utils/format';
import { FONTS } from '../../theme';
import { RollingValue } from '../animated';
import { StatsPanelSkeleton } from './Skeletons';

const StatCard: React.FC<{ label: string; value: string; tooltip?: string }> = ({
  label,
  value,
  tooltip,
}) => (
  <Box
    title={tooltip}
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

  const prices = useUsdPrices();

  // Volume renders as estimated USD (the one legitimate cross-backing sum),
  // canonical per-backing figures in the tooltip. Without prices, fall back
  // to per-backing "X SOL + Y TAO" (single sol-only entry keeps the legacy
  // bare number + "(SOL)" label).
  const volumeUsd = usdFromBackingMap(
    stats?.totalVolumeByBacking,
    prices,
    stats?.totalVolumeSol ?? 0,
  );
  const volumeEntries = backingEntries(
    stats?.totalVolumeByBacking,
    stats?.totalVolumeSol ?? 0,
  );
  const volumeDual = volumeEntries.length > 1;
  const volume =
    volumeUsd != null
      ? formatUsd(volumeUsd)
      : volumeDual
        ? volumeEntries
            .map((e) => `${e.amount} ${chainSymbol(e.chain)}`)
            .join(' + ')
        : volumeEntries[0].amount;
  const volumeLabel =
    volumeUsd != null
      ? 'Volume (est. USD)'
      : volumeDual
        ? 'Volume'
        : 'Volume (SOL)';
  const volumeTooltip =
    volumeUsd != null
      ? backingTooltip(stats?.totalVolumeByBacking, stats?.totalVolumeSol ?? 0)
      : undefined;

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
        <StatCard label={volumeLabel} value={volume} tooltip={volumeTooltip} />
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
