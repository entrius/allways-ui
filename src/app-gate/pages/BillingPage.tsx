import React, { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { FONTS } from '../../theme';
import { SEO } from '../../components';
import { useGateAccount } from '../account/GateAccountContext';
import { tierConfig, type Tier } from '../account/types';
import { GatePage, GateCard, SectionLabel } from '../ui';
import { formatDate } from '../format';
import MembershipCard from '../offering/MembershipCard';
import TierCards from '../offering/TierCards';
import SubscribeDialog from '../offering/SubscribeDialog';

const BillingPage: React.FC = () => {
  const { account, cancelMembership } = useGateAccount();
  const [tier, setTier] = useState<Tier | null>(null);
  const membership = account?.membership;
  const cfg = membership ? tierConfig(membership.tier) : null;

  return (
    <GatePage
      eyebrow="Account"
      title="Billing"
      subtitle="Manage your plan and view payment history."
    >
      <SEO title="Billing" description="Manage your Allways Access plan." />

      <Box sx={{ maxWidth: 520, mb: 4 }}>
        <MembershipCard />
      </Box>

      {membership?.status === 'active' && cfg && membership.startedAt && (
        <>
          <SectionLabel>Payment history</SectionLabel>
          <GateCard sx={{ mb: 4 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Stack>
                <Typography
                  sx={{
                    fontFamily: FONTS.body,
                    fontWeight: 600,
                    fontSize: '0.88rem',
                  }}
                >
                  {cfg.name} — monthly
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.68rem',
                    color: 'text.secondary',
                  }}
                >
                  {formatDate(membership.startedAt)}
                </Typography>
              </Stack>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                {cfg.priceTao} TAO
              </Typography>
            </Stack>
          </GateCard>
        </>
      )}

      <SectionLabel>Change plan</SectionLabel>
      <TierCards
        onSelect={setTier}
        currentTier={membership?.tier ?? null}
        ctaLabel="Switch to"
      />

      {membership?.status === 'active' && (
        <Box sx={{ mt: 4 }}>
          <Button
            onClick={cancelMembership}
            variant="text"
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.74rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'text.secondary',
              '&:hover': { color: 'error.main' },
            }}
          >
            Cancel membership
          </Button>
        </Box>
      )}

      <SubscribeDialog
        open={!!tier}
        tier={tier}
        onClose={() => setTier(null)}
      />
    </GatePage>
  );
};

export default BillingPage;
