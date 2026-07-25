import React from 'react';
import { Box, Stack } from '@mui/material';
import {
  ReservationsTracker,
  SwapTracker,
  TabbedPanel,
  TransactionsPulse,
  Page,
  SEO,
} from '../components';

// Explorer page — the block-explorer half of the market/explorer split:
// every transaction with its lifecycle, active reservations, and the raw
// event tape, each as a full-height tab. Rate charts and liquidity live on
// /market. Deep links (/swap/:id, /reservations/:hash) are this page's
// detail views.
const TransactionsPage: React.FC = () => {
  return (
    <Page>
      <SEO
        title="Transactions"
        description="Every cross-chain transaction on Allways — Bittensor SN7"
      />
      <Stack
        sx={{
          backgroundColor: 'background.default',
          px: { xs: 1.5, sm: 2, md: 3 },
          pt: { xs: 1.5, md: 2 },
          pb: { xs: 2, md: 2 },
          width: '100%',
          height: { xs: 'auto', md: 'calc(100dvh - 56px)' },
          minHeight: 0,
          overflow: { md: 'hidden' },
        }}
      >
        {/* Explorer feeds are reading columns — cap the line length instead
            of stretching cards across a wide viewport. */}
        <Box
          sx={{
            flex: 1,
            minHeight: { xs: 560, md: 0 },
            width: '100%',
            maxWidth: 1080,
            mx: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1.5, md: 2 },
          }}
        >
          {/* The live pulse: every transaction as a dot rising through its
              lifecycle in real time; the tabbed feeds below stay the
              row-level record. */}
          <TransactionsPulse />
          {/* TabbedPanel fills whatever height the pulse leaves; on mobile
              the page scrolls, so give the feeds a real minimum instead. */}
          <Box sx={{ flex: 1, minHeight: { xs: 480, md: 0 } }}>
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
              ]}
            />
          </Box>
        </Box>
      </Stack>
    </Page>
  );
};

export default TransactionsPage;
