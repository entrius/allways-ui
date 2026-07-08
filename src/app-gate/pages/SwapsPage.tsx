import React from 'react';
import { Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { FONTS } from '../../theme';
import { SEO } from '../../components';
import { useGateAccount } from '../account/GateAccountContext';
import { GatePage, EmptyState } from '../ui';
import SwapTable from '../SwapTable';

const SwapsPage: React.FC = () => {
  const { account } = useGateAccount();
  const swaps = account?.swaps ?? [];

  return (
    <GatePage
      eyebrow="History"
      title="Swaps"
      subtitle="Every exchange routed through your account."
    >
      <SEO title="Swaps" description="Your Allways Access swap history." />
      {swaps.length === 0 ? (
        <EmptyState
          title="No swaps yet"
          hint="Your completed and in-flight swaps will appear here."
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
              Start a swap
            </Button>
          }
        />
      ) : (
        <SwapTable swaps={swaps} />
      )}
    </GatePage>
  );
};

export default SwapsPage;
