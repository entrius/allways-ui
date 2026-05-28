import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Stack, Typography } from '@mui/material';
import { Card, Page, SEO } from '../components';
import { useAllSwaps } from '../api/SwapsApi';
import { useWallet } from '../wallet/WalletProvider';
import { FONTS } from '../theme';
import { shortAddr } from '../utils/format';

const MySwapsPage: React.FC = () => {
  const { substrate, bitcoin } = useWallet();
  // Filter by whichever address we have; das-allways `search` matches both
  // user and source/dest sides.
  const search = substrate?.address ?? bitcoin?.address ?? '';
  const { data, isLoading } = useAllSwaps({ search, limit: 50 }, !!search);

  return (
    <Page title="My swaps">
      <SEO
        title="My swaps"
        description="Swaps tied to your connected wallet."
      />
      <Stack
        sx={{
          width: '100%',
          maxWidth: 720,
          mx: 'auto',
          px: 2,
          py: { xs: 4, md: 6 },
          gap: 2,
        }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontWeight: 900,
            fontSize: '1.4rem',
          }}
        >
          My swaps
        </Typography>

        {!search && (
          <Alert severity="info" sx={{ borderRadius: 0 }}>
            Connect a wallet on the Exchange page to see swaps tied to your
            address.
          </Alert>
        )}

        {search && isLoading && (
          <Typography sx={{ fontFamily: FONTS.mono, color: 'text.secondary' }}>
            Loading…
          </Typography>
        )}

        {search && !isLoading && (data ?? []).length === 0 && (
          <Typography sx={{ fontFamily: FONTS.mono, color: 'text.secondary' }}>
            No swaps yet for {shortAddr(search)}.
          </Typography>
        )}

        {(data ?? []).map((swap) => (
          <Card key={swap.swapId}>
            <Stack
              component={RouterLink}
              to={`/swap/${swap.swapId}`}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
              sx={{
                textDecoration: 'none',
                color: 'text.primary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              <Stack>
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  #{swap.swapId} · {swap.sourceChain?.toUpperCase()}
                  {' → '}
                  {swap.destChain?.toUpperCase()}
                </Typography>
                {swap.minerHotkey && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                    }}
                  >
                    miner {shortAddr(swap.minerHotkey)}
                  </Typography>
                )}
              </Stack>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                }}
              >
                {swap.status}
              </Typography>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Page>
  );
};

export default MySwapsPage;
