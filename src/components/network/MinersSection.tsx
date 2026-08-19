import React, { useCallback } from 'react';
import { Stack, useMediaQuery, useTheme } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import CrownRateChart from '../miners/CrownRateChart';
import CrownTimeLeaderboard from '../miners/CrownTimeLeaderboard';
import MinerLeaderboard from '../miners/MinerLeaderboard';
import {
  isDirection,
  isRange,
  isRateRange,
  type Range,
  type RateRange,
} from '../../api';

/**
 * The miners half of the network page: leaderboard, crown history and the
 * crown rate chart. Its selections stay in the URL (`range`, `rateRange`,
 * `rateDir`) — they share the query string with the tape's filters above,
 * which use their own names, so one link restores the whole page.
 */
const MinersSection: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const theme = useTheme();
  // Crown History and the rate chart are dense, wide panels that are noisy and
  // unusable on a phone — skip them entirely below md so the section is just
  // the KPIs and the leaderboard.
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const rangeParam = params.get('range');
  // Default to 1h — the live scoring window — so the section opens on the
  // data that reflects current scoring.
  const range: Range = isRange(rangeParam) ? rangeParam : '1h';
  const rateRangeParam = params.get('rateRange');
  const rateRange: RateRange = isRateRange(rateRangeParam)
    ? rateRangeParam
    : '24h';
  const rateDirParam = params.get('rateDir');
  const rateDirection = isDirection(rateDirParam) ? rateDirParam : 'SOL-BTC';

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
    <Stack sx={{ width: '100%' }}>
      <MinerLeaderboard
        range={range}
        onRangeChange={(r) => setParam('range', r)}
      />
      {!isMobile && (
        <>
          {/* One panel per direction pair runs to thousands of pixels on
              its own; the holder grid scrolls inside a fixed frame so the
              page stays a few screens tall and the stats below stay
              reachable. The rate chart shows one direction at a time behind
              its own select, so it needs no cap. */}
          <CrownTimeLeaderboard maxBodyHeight={460} />
          <CrownRateChart
            range={rateRange}
            onRangeChange={(r) => setParam('rateRange', r)}
            direction={rateDirection}
            onDirectionChange={(d) => setParam('rateDir', d)}
          />
        </>
      )}
    </Stack>
  );
};

export default MinersSection;
