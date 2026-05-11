import React from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { FONTS } from '../theme';
import { useWallet } from './WalletProvider';

/**
 * Banner shown once when a BTC-source user has no Substrate wallet connected.
 * Surfaces the tradeoff: claim path falls back to CLI if the miner is slashed.
 * See spec §7 — wallet rules.
 */
const SubstrateOptionalBanner: React.FC = () => {
  const {
    substrate,
    acknowledgedSubstrateOptional,
    acknowledgeSubstrateOptional,
  } = useWallet();

  if (substrate || acknowledgedSubstrateOptional) return null;

  return (
    <Alert
      severity="info"
      sx={{
        borderRadius: 0,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack spacing={1}>
        <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.85rem' }}>
          No Substrate wallet connected. You can still swap BTC → TAO by pasting
          a TAO destination address.
        </Typography>
        <Typography
          sx={{
            fontFamily: FONTS.body,
            fontSize: '0.75rem',
            color: 'text.secondary',
          }}
        >
          If the miner is slashed, you'll need the <code>alw claim</code> CLI
          (or to connect a Substrate wallet later) to recover funds.
        </Typography>
        <Button
          size="small"
          variant="text"
          onClick={acknowledgeSubstrateOptional}
          sx={{ alignSelf: 'flex-start' }}
        >
          Got it
        </Button>
      </Stack>
    </Alert>
  );
};

export default SubstrateOptionalBanner;
