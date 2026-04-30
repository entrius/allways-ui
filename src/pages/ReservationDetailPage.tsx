import React from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useProtocolConstants, useReservation } from '../api';
import { FONTS } from '../theme';
import { formatAmount } from '../utils/format';
import { Card, LabelValue, PageWrapper } from '../components';
import ExtensionChip, {
  deriveReservationExtensionStatus,
} from '../components/ExtensionChip';

const ReservationDetailPage: React.FC = () => {
  const { requestHash } = useParams<{ requestHash: string }>();
  const theme = useTheme();
  const { data: r, isLoading } = useReservation(requestHash ?? '');
  const { data: protocol } = useProtocolConstants();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!r) {
    return (
      <PageWrapper>
        <Typography sx={{ fontFamily: FONTS.mono, color: 'text.secondary' }}>
          Reservation {requestHash} not found
        </Typography>
      </PageWrapper>
    );
  }

  const statusColor =
    r.status === 'INITIATED'
      ? theme.palette.status.fulfilled
      : r.status === 'ACTIVE'
        ? theme.palette.status.active
        : theme.palette.status.timedOut;

  const extensionStatus = deriveReservationExtensionStatus(r, protocol);
  const sourceLine =
    r.fromAmount && r.fromChain
      ? formatAmount(r.fromAmount, r.fromChain)
      : '—';
  const destLine =
    r.toAmount && r.toChain ? formatAmount(r.toAmount, r.toChain) : '—';

  return (
    <PageWrapper>
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
        <Box sx={{ flex: 1 }} />
        <Chip
          label={r.status}
          size="small"
          variant="outlined"
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            fontWeight: 600,
            borderRadius: 0,
            borderColor: statusColor,
            color: statusColor,
          }}
        />
      </Stack>

      <Typography
        sx={{
          fontFamily: FONTS.heading,
          fontWeight: 900,
          fontSize: '1.5rem',
          color: 'text.primary',
          mb: 3,
        }}
      >
        Reservation
      </Typography>

      {r.swapId && (
        <Card>
          <Typography
            component={RouterLink}
            to={`/swap/${r.swapId}`}
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.85rem',
              color: 'primary.main',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            View swap #{r.swapId} <ArrowForwardIcon sx={{ fontSize: 14 }} />
          </Typography>
        </Card>
      )}

      <Card>
        <Stack spacing={1.25}>
          <LabelValue label="Miner" value={r.minerHotkey} copyable />
          <LabelValue label="Source" value={sourceLine} />
          <LabelValue label="Dest" value={destLine} />
          <LabelValue label="Send from" value={r.userFromAddress} copyable />
          <LabelValue
            label="Reserved until"
            value={`Block #${r.reservedUntilBlock}`}
          />
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: 'text.secondary',
                minWidth: 80,
              }}
            >
              Extensions
            </Typography>
            <ExtensionChip status={extensionStatus} />
            {extensionStatus.kind === 'none' && (
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                }}
              >
                None
              </Typography>
            )}
          </Stack>
          <LabelValue label="Hash" value={r.requestHash} copyable />
        </Stack>
      </Card>
    </PageWrapper>
  );
};

export default ReservationDetailPage;
