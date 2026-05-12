import React, { useEffect, useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useMinerStats, type Direction, type Range } from '../../api';
import CrownRateChart from './CrownRateChart';
import MinerSwapHistory from './MinerSwapHistory';
import { EarningDiagnostic, EarningNowBanner } from './EarningDiagnostic';
import { FONTS } from '../../theme';

const HOTKEY_SHORT = (h: string) => `${h.slice(0, 4)}…${h.slice(-4)}`;

const FilteredMinerSection: React.FC<{
  hotkey: string;
  direction: Direction;
  rateRange: '1h' | '4h' | '24h' | '7d';
  onRateRangeChange: (r: '1h' | '4h' | '24h' | '7d') => void;
  range: Range;
}> = ({ hotkey, direction, rateRange, onRateRangeChange, range }) => {
  const navigate = useNavigate();
  const { data: stats } = useMinerStats(hotkey, range);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hotkey]);

  return (
    <Box
      ref={ref}
      sx={{
        mt: 7,
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: '2px solid',
        borderLeftColor: 'primary.main',
        backgroundColor: 'rgba(0,82,255,0.04)',
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
        sx={{
          pb: 2,
          mb: 2.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" alignItems="baseline" spacing={1.5}>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Filtered ·{' '}
            <Box
              component="span"
              sx={{ color: 'primary.main', fontWeight: 500 }}
            >
              uid {stats ? '' : '?'}
            </Box>
          </Typography>
          <Typography
            variant="mono"
            sx={{ fontSize: '0.7rem', color: 'text.disabled' }}
          >
            {HOTKEY_SHORT(hotkey)}
            {stats?.collateralRao &&
              ` · collateral ${(Number(stats.collateralRao) / 1e9).toFixed(2)} TAO`}
            {stats?.activatedAt != null &&
              ` · activated #${stats.activatedAt.toLocaleString()}`}
          </Typography>
        </Stack>
        <Typography
          component="button"
          onClick={() => navigate('/miners')}
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            color: 'text.secondary',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            '&:hover': { color: 'text.primary' },
          }}
        >
          clear ✕
        </Typography>
      </Stack>

      <EarningNowBanner hotkey={hotkey} />
      <EarningDiagnostic hotkey={hotkey} />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <CrownRateChart
            direction={direction}
            range={rateRange}
            onRangeChange={onRateRangeChange}
            minerHotkey={hotkey}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <MinerSwapHistory hotkey={hotkey} />
        </Box>
      </Stack>
    </Box>
  );
};

export default FilteredMinerSection;
