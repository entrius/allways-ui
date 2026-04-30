import React from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useReservationsBySource } from '../api';
import { FONTS } from '../theme';
import CopyableAddress from '../components/CopyableAddress';

const ReservationsBySourcePage: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const theme = useTheme();
  const { data, isLoading } = useReservationsBySource(address ?? '');

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  const reservations = data ?? [];

  return (
    <Stack
      sx={{
        backgroundColor: 'background.default',
        px: { xs: 1.5, sm: 2, md: 4 },
        py: { xs: 2, sm: 3, md: 4 },
        width: '100%',
        maxWidth: 800,
        mx: 'auto',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Typography
          component={RouterLink}
          to="/dashboard"
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.8rem',
            color: 'text.secondary',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            '&:hover': { color: 'primary.main' },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 14 }} /> Dashboard
        </Typography>
      </Stack>

      <Typography
        sx={{
          fontFamily: FONTS.heading,
          fontWeight: 900,
          fontSize: '1.5rem',
          color: 'text.primary',
          mb: 1,
        }}
      >
        Reservations
      </Typography>
      <Box sx={{ mb: 3 }}>
        <CopyableAddress address={address ?? ''} fontSize="0.8rem" />
      </Box>

      {reservations.length === 0 ? (
        <Typography sx={{ fontFamily: FONTS.mono, color: 'text.secondary' }}>
          No reservations found for this address.
        </Typography>
      ) : (
        <Stack spacing={1}>
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
                key={r.requestHash}
                component={RouterLink}
                to={`/reservations/${r.requestHash}`}
                sx={{
                  p: 2,
                  borderRadius: 0,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  textDecoration: 'none',
                  display: 'block',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.8rem',
                      color: 'text.primary',
                    }}
                  >
                    {(r.fromChain ?? '').toUpperCase()} →{' '}
                    {(r.toChain ?? '').toUpperCase()} · miner{' '}
                    {r.minerHotkey.slice(0, 6)}…
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: statusColor,
                    }}
                  >
                    {r.status}
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                    mt: 0.5,
                  }}
                >
                  Block #{r.reservedUntilBlock} ·{' '}
                  {new Date(r.createdAt).toLocaleString()}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};

export default ReservationsBySourcePage;
