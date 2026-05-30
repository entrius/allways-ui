import React, { useState } from 'react';
import { Box, Stack, useMediaQuery, useTheme } from '@mui/material';
import {
  AllwaysMarketRate,
  EventFeed,
  MinerRatesTable,
  RatesTicker,
  ReservationsTracker,
  SwapTracker,
  TabbedPanel,
  Page,
  SEO,
} from '../components';
import type { Direction } from '../api/models/MinersDashboard';

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
  // Shared trade direction — the Market Rate toggle drives both the chart and
  // the Active Rates table filter.
  const [direction, setDirection] = useState<Direction>('BTC-TAO');

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
            gridTemplateColumns: { xs: '1fr', md: '0.82fr 2fr 0.8fr' },
            gridTemplateRows: { md: '1fr' },
          }}
        >
          {/* Left column (desktop) / second on mobile: the live rates table.
              Kept above the unbounded transactions list on mobile. */}
          <Box
            sx={{
              ...colSx,
              minHeight: { xs: 340, md: 0 },
              order: { xs: 2, md: 0 },
            }}
          >
            <MinerRatesTable syncDirection={direction} />
          </Box>

          {/* Middle column (focus); first on mobile: the market-rate chart with
              a direction toggle that also filters the Active Rates table. */}
          <Box
            sx={{
              ...colSx,
              minHeight: { xs: 440, md: 0 },
              order: { xs: 1, md: 0 },
            }}
          >
            <AllwaysMarketRate
              direction={direction}
              onDirectionChange={setDirection}
            />
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
