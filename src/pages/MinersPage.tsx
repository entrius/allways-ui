import React, { useCallback } from 'react';
import { Box, Stack } from '@mui/material';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  CrownHistoryGrid,
  CrownRateChart,
  FilteredMinerSection,
  MinerLeaderboard,
  NetworkOverviewStats,
  StickyNetworkHeader,
  SEO,
} from '../components';
import type { Direction, Range } from '../api';

const isDirection = (v: string | null): v is Direction =>
  v === 'BTC-TAO' || v === 'TAO-BTC';

const isRange = (v: string | null): v is Range =>
  ['24h', '7d', '30d', '90d', 'all'].includes(v ?? '');

const isCrownRange = (v: string | null): v is '1h' | '4h' =>
  v === '1h' || v === '4h';

const isRateRange = (v: string | null): v is '1h' | '4h' | '24h' | '7d' =>
  ['1h', '4h', '24h', '7d'].includes(v ?? '');

const MinersPage: React.FC = () => {
  const { hotkey } = useParams<{ hotkey?: string }>();
  const [params, setParams] = useSearchParams();

  const range: Range = isRange(params.get('range'))
    ? (params.get('range') as Range)
    : '30d';
  const direction: Direction = isDirection(params.get('pair'))
    ? (params.get('pair') as Direction)
    : 'BTC-TAO';
  const crownRange = isCrownRange(params.get('crownRange'))
    ? (params.get('crownRange') as '1h' | '4h')
    : '1h';
  const rateRange = isRateRange(params.get('rateRange'))
    ? (params.get('rateRange') as '1h' | '4h' | '24h' | '7d')
    : '1h';
  const pan = Number(params.get('pan') ?? '0') || 0;

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const next = new URLSearchParams(params);
      if (value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <SEO
        title="Miners"
        description="Public miner dashboard for Allways — crown share, success rate, and diagnostic detail"
      />
      <StickyNetworkHeader />
      <Stack
        sx={{
          px: { xs: 1.5, sm: 2, md: 4 },
          py: { xs: 2, sm: 3, md: 4 },
          maxWidth: 1400,
          mx: 'auto',
        }}
      >
        <NetworkOverviewStats range={range} />
        <MinerLeaderboard
          activeHotkey={hotkey}
          range={range}
          onRangeChange={(r) => setParam('range', r)}
        />
        <CrownHistoryGrid
          direction={direction}
          onDirectionChange={(d) => setParam('pair', d)}
          range={crownRange}
          onRangeChange={(r) => setParam('crownRange', r)}
          pan={pan}
          onPanChange={(p) => setParam('pan', p === 0 ? undefined : String(p))}
        />
        <CrownRateChart
          direction={direction}
          range={rateRange}
          onRangeChange={(r) => setParam('rateRange', r)}
        />
        {hotkey && (
          <FilteredMinerSection
            hotkey={hotkey}
            direction={direction}
            rateRange={rateRange}
            onRateRangeChange={(r) => setParam('rateRange', r)}
            range={range}
          />
        )}
      </Stack>
    </Box>
  );
};

export default MinersPage;
