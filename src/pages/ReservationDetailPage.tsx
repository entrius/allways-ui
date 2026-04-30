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
import { useReservation } from '../api';
import { FONTS } from '../theme';
import CopyableAddress from '../components/CopyableAddress';
import ExtensionChip, {
  deriveReservationExtensionStatus,
} from '../components/ExtensionChip';

const ReservationDetailPage: React.FC = () => {
  const { requestHash } = useParams<{ requestHash: string }>();
  const theme = useTheme();
  const { data: r, isLoading } = useReservation(requestHash ?? '');

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
          <LabelValue
            label="Source"
            value={`${r.fromAmount ?? '—'} ${r.fromChain?.toUpperCase() ?? ''}`}
          />
          <LabelValue
            label="Dest"
            value={`${r.toAmount ?? '—'} ${r.toChain?.toUpperCase() ?? ''}`}
          />
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
            <ExtensionChip status={deriveReservationExtensionStatus(r)} />
            {r.extensionsUsed === 0 && !r.pendingExtensionTarget && (
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

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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
    {children}
  </Stack>
);

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      p: 2,
      mb: 2,
      borderRadius: 0,
      backgroundColor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
    }}
  >
    {children}
  </Box>
);

const LabelValue: React.FC<{
  label: string;
  value: string;
  copyable?: boolean;
}> = ({ label, value, copyable }) => (
  <Stack direction="row" spacing={1} alignItems="baseline">
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        color: 'text.secondary',
        minWidth: 80,
      }}
    >
      {label}
    </Typography>
    {copyable ? (
      <CopyableAddress address={value} fontSize="0.75rem" />
    ) : (
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.75rem',
          color: 'text.primary',
        }}
      >
        {value}
      </Typography>
    )}
  </Stack>
);

export default ReservationDetailPage;
