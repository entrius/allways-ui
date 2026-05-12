import React, { useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { FONTS } from '../../theme';
import { useWallet } from '../../wallet/WalletProvider';
import { claimSlash } from '../../wallet/substrate';

interface Props {
  swapId: string;
  /** When set, only show the button if the wallet matches the swap's user_address. */
  expectedUserAddress?: string | null;
}

/**
 * Browser-side claim for slashed swaps. Calls the ink! contract's
 * `claim_slash(swap_id)` via `pallet_contracts::call` — same path the
 * validator uses server-side. swap-api is not involved (spec §5 / §9).
 */
const ClaimSlashedButton: React.FC<Props> = ({
  swapId,
  expectedUserAddress,
}) => {
  const { substrate } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string | null>(null);

  if (!substrate) {
    return (
      <Alert severity="info" sx={{ borderRadius: 0 }}>
        <Typography sx={{ fontFamily: FONTS.body, fontSize: '0.85rem' }}>
          Connect a Substrate wallet to claim from the browser, or run{' '}
          <code>alw claim {swapId}</code> from the CLI.
        </Typography>
      </Alert>
    );
  }

  if (
    expectedUserAddress &&
    substrate.address.toLowerCase() !== expectedUserAddress.toLowerCase()
  ) {
    return null;
  }

  const handleClaim = async () => {
    setBusy(true);
    setError(null);
    try {
      const ref = await claimSlash(substrate, swapId);
      setTxRef(ref);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1}>
      <Button
        variant="contained"
        onClick={handleClaim}
        disabled={busy}
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.8rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          alignSelf: 'flex-start',
          borderRadius: 0,
        }}
      >
        {busy ? 'Submitting…' : 'Claim slashed collateral'}
      </Button>
      {txRef && (
        <Alert severity="success" sx={{ borderRadius: 0 }}>
          Claim submitted ({txRef}). Refresh after a few blocks to see funds.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {error}
        </Alert>
      )}
    </Stack>
  );
};

export default ClaimSlashedButton;
