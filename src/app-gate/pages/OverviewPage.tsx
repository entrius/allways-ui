import React from 'react';
import { Box, Button, Stack } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link as RouterLink } from 'react-router-dom';
import { FONTS } from '../../theme';
import { SEO } from '../../components';
import { useGateAccount } from '../account/GateAccountContext';
import { GatePage, StatTile, SectionLabel, EmptyState } from '../ui';
import MembershipCard from '../offering/MembershipCard';
import SwapTable from '../SwapTable';
import { shortAddress } from '../format';

const OverviewPage: React.FC = () => {
  const { account, connected } = useGateAccount();
  const swaps = account?.swaps ?? [];
  const completed = swaps.filter((s) => s.status === 'completed').length;
  const wallets = account?.wallets.length ?? 0;

  return (
    <GatePage
      eyebrow="Dashboard"
      title="Overview"
      subtitle={
        connected
          ? `Signed in as ${shortAddress(connected.address)}`
          : undefined
      }
    >
      <SEO title="Overview" description="Your Allways Access account." />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <Box sx={{ flex: 1.4 }}>
          <MembershipCard />
        </Box>
        <Stack direction="row" spacing={2} sx={{ flex: 2 }}>
          <Box sx={{ flex: 1 }}>
            <StatTile label="Total swaps" value={String(swaps.length)} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <StatTile label="Completed" value={String(completed)} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <StatTile label="Wallets" value={String(wallets)} />
          </Box>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <SectionLabel>Recent swaps</SectionLabel>
        <Button
          component={RouterLink}
          to="/app/swaps"
          endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            mb: 1,
          }}
        >
          View all
        </Button>
      </Stack>

      {swaps.length === 0 ? (
        <EmptyState
          title="No swaps yet"
          hint="Run your first exchange to see it here."
          action={
            <Button
              component={RouterLink}
              to="/app/exchange"
              variant="contained"
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                boxShadow: 'none',
              }}
            >
              Go to exchange
            </Button>
          }
        />
      ) : (
        <SwapTable swaps={swaps} limit={4} />
      )}
    </GatePage>
  );
};

export default OverviewPage;
