import React, { useState } from 'react';
import { Box, Stack, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  AllwaysMarketRate,
  EventFeed,
  MinerRatesTable,
  OrderbookDepth,
  RatesTicker,
  ReservationsTracker,
  SwapTracker,
  TabbedPanel,
  Page,
  SEO,
} from '../components';
import type { Direction } from '../api/models/MinersDashboard';
import { FONTS } from '../theme';

// Card-less column: no surface/border box (cohesive taostats-style); columns
// are separated by thin dividers + padding instead. Flex column so children
// that size to `height: 100%` fill and scroll internally, never the page.
const colSx = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
} as const;

// A single titled activity column: a mono-eyebrow header (matching the tab
// labels) over content that fills the remaining height and scrolls internally.
const ColumnPanel: React.FC<{
  label: string;
  info?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, info, children }) => (
  <Box sx={{ ...colSx, height: '100%' }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        mb: 1.5,
        pb: 0.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        component="span"
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          lineHeight: 1,
          color: 'text.primary',
        }}
      >
        {label}
      </Box>
      {info && (
        <Tooltip title={info} arrow placement="top">
          <Box
            component="span"
            sx={{ display: 'inline-flex', color: 'text.secondary' }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 13, display: 'block' }} />
          </Box>
        </Tooltip>
      )}
    </Box>
    <Box
      sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </Box>
  </Box>
);

const DashboardPage: React.FC = () => {
  // Shared trade direction — the Market Rate toggle drives the chart, the
  // Active Rates table filter, and the orderbook. `showBoth` is the chart's
  // BOTH view, lifted here so the orderbook can show both sides too.
  const [direction, setDirection] = useState<Direction>('BTC-TAO');
  const [showBoth, setShowBoth] = useState(false);

  // Below md the layout stacks into one column — treat as "mobile": lead with
  // the chart and collapse the activity columns into a single toggled panel.
  const theme = useTheme();
  const isStacked = useMediaQuery(theme.breakpoints.down('md'));

  // Activity panels — rendered as 3 side-by-side columns on desktop and a
  // single toggled panel on small screens.
  const activityPanels = [
    {
      key: 'tx',
      label: 'Transactions',
      info: (
        <Box sx={{ maxWidth: 280 }}>
          Every transaction in chronological order with its lifecycle progress:
          Initiated → Fulfilled → Completed (or Timed Out). Click a row for the
          full timeline.
        </Box>
      ),
      node: <SwapTracker embedded />,
    },
    {
      key: 'reservations',
      label: 'Reservations',
      info: (
        <Box sx={{ maxWidth: 260 }}>
          Short holds a user places on a miner's quoted rate before sending
          funds — locks the rate and prevents others from claiming the same
          miner mid-swap.
        </Box>
      ),
      node: <ReservationsTracker embedded />,
    },
    {
      key: 'events',
      label: 'Events',
      info: (
        <Box sx={{ maxWidth: 280 }}>
          Real-time stream of contract and chain events — swap lifecycle,
          collateral changes, votes, reservations. Newest first.
        </Box>
      ),
      node: <EventFeed embedded />,
    },
  ];

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
              showBoth={showBoth}
              onShowBothChange={setShowBoth}
            />
          </Box>

          {/* Right column: depth-of-market orderbook — cumulative miner
              liquidity available at each rate. Last on mobile. */}
          <Box
            sx={{
              ...colSx,
              minHeight: { xs: 440, md: 0 },
              order: { xs: 3, md: 0 },
            }}
          >
            <OrderbookDepth direction={direction} showBoth={showBoth} />
          </Box>
        </Box>

        {/* Activity feeds: 3 side-by-side columns on desktop; a single toggled
            panel on small screens. */}
        {isStacked ? (
          <Box sx={{ ...colSx, mt: 3, minHeight: 440, flexShrink: 0 }}>
            <TabbedPanel tabs={activityPanels} />
          </Box>
        ) : (
          <Box
            sx={{
              mt: 2.5,
              height: 300,
              flexShrink: 0,
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: 'repeat(3, 1fr)',
            }}
          >
            {activityPanels.map((p) => (
              <ColumnPanel key={p.key} label={p.label} info={p.info}>
                {p.node}
              </ColumnPanel>
            ))}
          </Box>
        )}
      </Stack>
    </Page>
  );
};

export default DashboardPage;
