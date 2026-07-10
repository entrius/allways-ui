import React, { useCallback } from 'react';
import { Box, Stack, useMediaQuery, useTheme } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import {
  AllwaysMarketRate,
  EventFeed,
  MinerRatesTable,
  OrderbookDepth,
  RatesTicker,
  ReservationsTracker,
  StatsStrip,
  SwapTracker,
  TabbedPanel,
  Page,
  SEO,
} from '../components';
import { isDirection } from '../api';
import type { Direction } from '../api/models/MinersDashboard';

// Opening view when the URL says nothing. Kept off the URL so a bare
// /dashboard and /dashboard?direction=SOL-BTC render the same thing.
const DEFAULT_DIRECTION: Direction = 'SOL-BTC';

// Card-less column: no surface/border box (cohesive taostats-style); columns
// are separated by thin dividers + padding instead. Flex column so children
// that size to `height: 100%` fill and scroll internally, never the page.
const colSx = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
} as const;

const DashboardPage: React.FC = () => {
  const [params, setParams] = useSearchParams();

  // Shared trade direction — the Market Rate toggle drives both the chart and
  // the Active Rates table filter. An unrecognised ?direction= falls back to
  // the default rather than rendering an empty chart.
  const directionParam = params.get('direction');
  const direction: Direction = isDirection(directionParam)
    ? directionParam
    : DEFAULT_DIRECTION;

  const setDirection = useCallback(
    (value: Direction) => {
      // Clone so unrelated params on the URL survive the write.
      const next = new URLSearchParams(params);
      if (value === DEFAULT_DIRECTION) next.delete('direction');
      else next.set('direction', value);
      // replace: toggling a chart direction is not a navigation step; the back
      // button should leave the dashboard, not walk back through toggles.
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  // Below md the layout stacks into one column — treat as "mobile": lead with
  // the chart and drop the Events tab.
  const theme = useTheme();
  const isStacked = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Page>
      <SEO
        title="Dashboard"
        description="Live network activity for Allways — Bittensor SN7"
      />
      <Stack
        sx={{
          backgroundColor: 'background.default',
          px: { xs: 1.5, sm: 2, md: 3 },
          // No top padding so the eyebrow sits flush like the miners page; the
          // ticker provides its own top breathing room.
          pt: 0,
          pb: { xs: 2, md: 2 },
          width: '100%',
          // Fill the viewport below the 56px top nav so the terminal is a
          // single screen; panels scroll internally. Auto height on mobile —
          // that layout gets its own pass.
          height: { xs: 'auto', md: 'calc(100dvh - 56px)' },
          minHeight: 0,
          overflow: { md: 'hidden' },
        }}
      >
        <RatesTicker />

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            // Separate columns with whitespace, not hard dividers (cohesive
            // taostats look) — tight enough to avoid dead space.
            gap: { xs: 3, md: 2.5 },
            // Two columns: the chart + liquidity stack owns the width, the
            // live feeds keep their rail on the right.
            gridTemplateColumns: { xs: '1fr', md: '2.6fr 0.85fr' },
            gridTemplateRows: { md: '1fr' },
          }}
        >
          {/* Main column: the market-rate chart (its direction toggle drives
              everything below), the 24h stat strip, then the two liquidity
              views of that direction — orderbook and the live rates table. */}
          <Box
            sx={{
              ...colSx,
              minHeight: { xs: 440, md: 0 },
              order: { xs: 1, md: 0 },
            }}
          >
            <Box
              sx={{
                flex: 1.3,
                minHeight: { xs: 260, md: 0 },
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <AllwaysMarketRate
                direction={direction}
                onDirectionChange={setDirection}
              />
            </Box>
            <StatsStrip />
            {/* Orderbook is desktop-only: the stacked mobile layout already
                runs long, and the rates table carries the same liquidity. */}
            {!isStacked && (
              <Box
                sx={{
                  flex: 0.8,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  pt: 1,
                }}
              >
                <OrderbookDepth direction={direction} embedded />
              </Box>
            )}
            <Box
              sx={{
                flex: 1,
                minHeight: { xs: 340, md: 0 },
                display: 'flex',
                flexDirection: 'column',
                pt: 1.5,
              }}
            >
              <MinerRatesTable syncDirection={direction} />
            </Box>
          </Box>

          {/* Right column; last on mobile (its list is unbounded):
              transactions, reservations, and (desktop only) the event tape. */}
          <Box
            sx={{
              ...colSx,
              minHeight: { xs: 440, md: 0 },
              order: { xs: 3, md: 0 },
            }}
          >
            <TabbedPanel
              tabs={[
                {
                  key: 'tx',
                  label: 'Transactions',
                  info: (
                    <Box sx={{ maxWidth: 280 }}>
                      Every transaction in chronological order with its
                      lifecycle progress: Initiated → Fulfilled → Completed (or
                      Timed Out). Click a row for the full timeline.
                    </Box>
                  ),
                  node: <SwapTracker embedded />,
                },
                {
                  key: 'reservations',
                  label: 'Reservations',
                  info: (
                    <Box sx={{ maxWidth: 260 }}>
                      Short holds a user places on a miner's quoted rate before
                      sending funds — locks the rate and prevents others from
                      claiming the same miner mid-swap.
                    </Box>
                  ),
                  node: <ReservationsTracker embedded />,
                },
                // Events tape is desktop-only — too much for the mobile view.
                ...(isStacked
                  ? []
                  : [
                      {
                        key: 'events',
                        label: 'Events',
                        info: (
                          <Box sx={{ maxWidth: 280 }}>
                            Real-time stream of contract and chain events — swap
                            lifecycle, collateral changes, votes, reservations.
                            Newest first.
                          </Box>
                        ),
                        node: <EventFeed embedded />,
                      },
                    ]),
              ]}
            />
          </Box>
        </Box>
      </Stack>
    </Page>
  );
};

export default DashboardPage;
