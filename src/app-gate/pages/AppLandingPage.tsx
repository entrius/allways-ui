import React, { useEffect, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import ShuffleOutlinedIcon from '@mui/icons-material/ShuffleOutlined';
import { Navigate } from 'react-router-dom';
import { FONTS } from '../../theme';
import { SEO } from '../../components';
import { useGateAccount } from '../account/GateAccountContext';
import type { Tier } from '../account/types';
import TierCards from '../offering/TierCards';
import SubscribeDialog from '../offering/SubscribeDialog';
import WalletConnectDialog from '../wallet/WalletConnectDialog';

const PRIORITY_POINTS = [
  {
    icon: VerifiedUserOutlinedIcon,
    title: 'Whitelist, not free-for-all',
    body: 'The validator only forwards reservation requests from its own members — closing the self-reserve and competitor-spam vectors.',
  },
  {
    icon: BoltOutlinedIcon,
    title: 'Premium gets priority',
    body: 'When miners are scarce, Premium members are served ahead of Standard for the same window.',
  },
  {
    icon: ShuffleOutlinedIcon,
    title: 'Fair ties',
    body: 'Same-tier requests competing for the same miner are ordered randomly — no front-running advantage.',
  },
];

const AppLandingPage: React.FC = () => {
  const { isConnected, isMember } = useGateAccount();
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  // Once the wallet connects, continue into the subscribe flow for the tier the
  // visitor picked before connecting.
  useEffect(() => {
    if (isConnected && pendingTier && !subscribeOpen) {
      setConnectOpen(false);
      setSubscribeOpen(true);
    }
  }, [isConnected, pendingTier, subscribeOpen]);

  if (isMember) return <Navigate to="/app/overview" replace />;

  const handleSelect = (tier: Tier) => {
    setPendingTier(tier);
    if (isConnected) setSubscribeOpen(true);
    else setConnectOpen(true);
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 960,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        py: { xs: 5, md: 8 },
      }}
    >
      <SEO
        title="Access"
        description="Gated access to the Allways validator — subscribe to reserve miners and swap."
      />

      {/* Hero */}
      <Stack spacing={1.5} sx={{ mb: { xs: 5, md: 7 } }}>
        <Typography variant="eyebrow">Validator Access</Typography>
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontWeight: 900,
            fontSize: { xs: '2.2rem', md: '3.2rem' },
            lineHeight: 0.98,
            letterSpacing: '-0.03em',
          }}
        >
          Your front door to the Allways validator.
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.body,
            fontSize: { xs: '0.98rem', md: '1.15rem' },
            color: 'text.secondary',
            maxWidth: 620,
            lineHeight: 1.55,
          }}
        >
          Reservations through this validator are members-only. Connect your
          wallet, pick a plan, and your coldkey is whitelisted to reserve miners
          and swap — with priority when it counts.
        </Typography>
      </Stack>

      {/* Tiers */}
      <Box sx={{ mb: { xs: 5, md: 7 } }}>
        <TierCards onSelect={handleSelect} ctaLabel="Get" />
      </Box>

      {/* How prioritization works */}
      <Typography
        variant="monoSmall"
        sx={{
          letterSpacing: '0.15em',
          color: 'text.secondary',
          mb: 2,
          display: 'block',
        }}
      >
        How reservations are prioritized
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        {PRIORITY_POINTS.map(({ icon: Icon, title, body }) => (
          <Box
            key={title}
            sx={{
              flex: 1,
              p: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
          >
            <Icon sx={{ fontSize: 22, color: 'primary.main', mb: 1.25 }} />
            <Typography
              sx={{
                fontFamily: FONTS.heading,
                fontWeight: 700,
                fontSize: '0.98rem',
                mb: 0.75,
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.body,
                fontSize: '0.85rem',
                color: 'text.secondary',
                lineHeight: 1.5,
              }}
            >
              {body}
            </Typography>
          </Box>
        ))}
      </Stack>

      <WalletConnectDialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
      />
      <SubscribeDialog
        open={subscribeOpen}
        tier={pendingTier}
        onClose={() => {
          setSubscribeOpen(false);
          setPendingTier(null);
        }}
      />
    </Box>
  );
};

export default AppLandingPage;
