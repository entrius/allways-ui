import React, { useCallback } from 'react';
import { Stack } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import {
  CrownHistoryGrid,
  CrownRateChart,
  MinerLeaderboard,
  NetworkOverviewStats,
  Page,
  SEO,
  StickyNetworkHeader,
} from '../components';
import {
  isCrownRange,
  isDirection,
  isRange,
  isRateRange,
  type CrownRange,
  type Range,
  type RateRange,
} from '../api';

const MinersPage: React.FC = () => {
  const [params, setParams] = useSearchParams();

  const rangeParam = params.get('range');
  const range: Range = isRange(rangeParam) ? rangeParam : '30d';
  const pairParam = params.get('pair');
  const direction = isDirection(pairParam) ? pairParam : 'BTC-TAO';
  const crownRangeParam = params.get('crownRange');
  const crownRange: CrownRange = isCrownRange(crownRangeParam)
    ? crownRangeParam
    : '1h';
  const rateRangeParam = params.get('rateRange');
  const rateRange: RateRange = isRateRange(rateRangeParam)
    ? rateRangeParam
    : '4h';
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
    <Page title="Miners">
      <SEO
        title="Miners"
        description="Public miner dashboard for Allways — crown share, success rate, and swap history"
      />
      <StickyNetworkHeader />
      <Stack
        sx={{
          px: { xs: 1.5, sm: 2, md: 4 },
          py: { xs: 2, sm: 3, md: 4 },
          maxWidth: 1400,
          mx: 'auto',
          width: '100%',
        }}
      >
        <NetworkOverviewStats range={range} />
        <MinerLeaderboard
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
          range={rateRange}
          onRangeChange={(r) => setParam('rateRange', r)}
        />
      </Stack>
    </Page>
  );
};

export default MinersPage;
