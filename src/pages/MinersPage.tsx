import React, { useCallback } from 'react';
import { Stack, useMediaQuery, useTheme } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import {
  CrownRateChart,
  CrownTimeLeaderboard,
  MinerLeaderboard,
  Page,
  SEO,
} from '../components';
import { isRange, isRateRange, type Range, type RateRange } from '../api';

const MinersPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const theme = useTheme();
  // Crown History and the rate chart are dense, wide panels that are noisy and
  // unusable on a phone — skip them entirely below md so the page is just the
  // KPIs and the leaderboard.
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const rangeParam = params.get('range');
  // Default to 1h — the live scoring window — so the page opens on the data
  // that reflects current scoring.
  const range: Range = isRange(rangeParam) ? rangeParam : '1h';
  const rateRangeParam = params.get('rateRange');
  const rateRange: RateRange = isRateRange(rateRangeParam)
    ? rateRangeParam
    : '24h';

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
      <Stack
        sx={{
          px: { xs: 1.5, sm: 2, md: 4 },
          py: { xs: 2, sm: 3, md: 4 },
          maxWidth: 1400,
          mx: 'auto',
          width: '100%',
        }}
      >
        <MinerLeaderboard
          range={range}
          onRangeChange={(r) => setParam('range', r)}
        />
        {!isMobile && (
          <>
            <CrownTimeLeaderboard />
            <CrownRateChart
              range={rateRange}
              onRangeChange={(r) => setParam('rateRange', r)}
            />
          </>
        )}
      </Stack>
    </Page>
  );
};

export default MinersPage;
