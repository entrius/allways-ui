import React from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { useReservationsBySource } from '../api';
import { FONTS } from '../theme';
import CopyableAddress from '../components/CopyableAddress';
import { PageIntro, PageWrapper, StatusChip } from '../components';
import { assetLabel } from '../api/models/chains';
import { formatWallClock, shortAddr } from '../utils/format';

const ReservationsBySourcePage: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const theme = useTheme();
  const { data, isLoading } = useReservationsBySource(address ?? '');

  if (isLoading) {
    return (
      <PageWrapper>
        <Skeleton variant="text" width={120} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={320} height={48} sx={{ mb: 4 }} />
        <Skeleton variant="rectangular" height={72} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={72} />
      </PageWrapper>
    );
  }

  const reservations = data ?? [];

  return (
    <PageWrapper>
      <PageIntro
        back={{ to: '/network#transactions', label: 'Transactions' }}
        eyebrow="Reservations · by source address"
        title={shortAddr(address ?? '')}
        lead={<CopyableAddress address={address ?? ''} fontSize="0.8rem" />}
        mb={{ xs: 3, md: 4 }}
      />

      {reservations.length === 0 ? (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'text.secondary',
            textAlign: 'center',
            py: 6,
          }}
        >
          No reservations found for this address.
        </Typography>
      ) : (
        <Stack spacing={{ xs: 2, md: 3 }}>
          {reservations.map((r) => {
            const statusKey =
              r.status === 'ACTIVE'
                ? 'active'
                : r.status === 'INITIATED'
                  ? 'fulfilled'
                  : 'timedOut';
            const statusColor = theme.palette.status[statusKey];
            return (
              <Box
                key={r.id}
                component={RouterLink}
                to={`/reservations/${r.requestHash}`}
                sx={{
                  display: 'block',
                  p: { xs: 2.5, md: 3 },
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 0,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 120ms',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'text.primary',
                      }}
                    >
                      {assetLabel(r.fromChain ?? '')} →{' '}
                      {assetLabel(r.toChain ?? '')}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: FONTS.mono,
                        fontSize: '0.7rem',
                        color: 'text.secondary',
                        mt: 0.5,
                      }}
                    >
                      miner {r.minerHotkey.slice(0, 6)}… ·{' '}
                      {formatWallClock(
                        Math.floor(new Date(r.createdAt).getTime() / 1000),
                      )}
                    </Typography>
                  </Box>
                  <StatusChip label={r.status} color={statusColor} />
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </PageWrapper>
  );
};

export default ReservationsBySourcePage;
