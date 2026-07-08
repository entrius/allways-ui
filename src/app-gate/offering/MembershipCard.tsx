import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { FONTS } from '../../theme';
import { GateCard } from '../ui';
import { useGateAccount } from '../account/GateAccountContext';
import { tierConfig } from '../account/types';
import { daysUntil, formatDate } from '../format';

// Membership status summary. Shown on Overview and Billing.
const MembershipCard: React.FC = () => {
  const { account } = useGateAccount();
  const membership = account?.membership;

  if (!membership || membership.status !== 'active') {
    return (
      <GateCard>
        <Typography variant="eyebrow">Membership</Typography>
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontWeight: 700,
            fontSize: '1.1rem',
            mt: 0.5,
          }}
        >
          No active plan
        </Typography>
      </GateCard>
    );
  }

  const cfg = tierConfig(membership.tier);
  const featured = membership.tier === 'premium';

  return (
    <GateCard sx={{ borderColor: featured ? 'primary.main' : 'divider' }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Box>
          <Typography variant="eyebrow">Membership</Typography>
          <Stack
            direction="row"
            alignItems="baseline"
            spacing={1}
            sx={{ mt: 0.5 }}
          >
            <Typography
              sx={{
                fontFamily: FONTS.heading,
                fontWeight: 800,
                fontSize: '1.5rem',
                lineHeight: 1,
              }}
            >
              {cfg.name}
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.72rem',
                color: 'text.secondary',
              }}
            >
              {cfg.priceTao} TAO / mo
            </Typography>
          </Stack>
        </Box>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: 'success.main',
            }}
          />
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.66rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'success.main',
            }}
          >
            Active
          </Typography>
        </Stack>
      </Stack>

      {membership.renewsAt && (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.72rem',
            color: 'text.secondary',
            mt: 1.5,
          }}
        >
          Renews {formatDate(membership.renewsAt)} ·{' '}
          {daysUntil(membership.renewsAt)} days left
        </Typography>
      )}
    </GateCard>
  );
};

export default MembershipCard;
