import React from 'react';
import { Box, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { useStats, useUsdPrices } from '../../api';
import {
  backingEntries,
  backingTooltip,
  chainSymbol,
  formatUsd,
  usdFromBackingMap,
} from '../../utils/format';
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
  tooltip?: string;
}

const Metric: React.FC<MetricProps> = ({
  label,
  value,
  loading,
  unit,
  segments,
  tooltip,
}) => (
  <Stack
    title={tooltip}
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
  const prices = useUsdPrices();
  // Volume as estimated USD (canonical per-backing figures in the tooltip);
  // without prices, per-backing segments ("X SOL + Y TAO") — never summed.
  const volumeUsd = stats
    ? usdFromBackingMap(
        stats.totalVolumeByBacking,
        prices,
        stats.totalVolumeSol,
      )
    : null;
  const volumeSegs =
    volumeUsd != null
      ? [{ value: `≈${formatUsd(volumeUsd)}`, unit: '' }]
      : stats
        ? backingEntries(stats.totalVolumeByBacking, stats.totalVolumeSol).map(
            (e) => ({ value: e.amount, unit: chainSymbol(e.chain) }),
          )
        : [{ value: '0', unit: 'SOL' }];
  const volumeTooltip =
    volumeUsd != null && stats
      ? backingTooltip(stats.totalVolumeByBacking, stats.totalVolumeSol)
      : undefined;

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
          {/* Two figures, both cumulative: what the network has delivered
              and what it moved doing it. The live counters that used to sit
              beside them (active nodes, in-flight swaps) are snapshots of a
              single instant, so on a young network they read as "2" and "0"
              next to the totals and undersell the same system twice. Live
              movement is what the tape and /transactions are for. */}
          <Grid item xs={12} sm={6}>
            <Metric
              label="Successful Transactions"
              value={String(stats?.totalSwaps ?? 0)}
              loading={isLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Metric
              label="Volume"
              value=""
              segments={volumeSegs}
              tooltip={volumeTooltip}
              loading={isLoading}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default MetricsStrip;
