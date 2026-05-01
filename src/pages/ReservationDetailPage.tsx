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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  useChainState,
  useMinerByHotkey,
  useProtocolConstants,
  useReservation,
} from '../api';
import type { Miner } from '../api/models';
import { FONTS } from '../theme';
import { applyFee, formatAmount, formatTimeUntilBlock } from '../utils/format';
import { Card, LabelValue, PageWrapper } from '../components';
import ExtensionChip, {
  deriveReservationExtensionStatus,
} from '../components/ExtensionChip';

type StageState = 'done' | 'current' | 'pending' | 'failed';

const minerSendToAddress = (
  fromChain: string | null,
  miner: Miner | undefined,
): string | null => {
  if (!miner || !fromChain) return null;
  if (miner.sourceChain === fromChain) return miner.sourceAddress;
  if (miner.destChain === fromChain) return miner.destAddress;
  return null;
};

const relativeTime = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
};

const ReservationDetailPage: React.FC = () => {
  const { requestHash } = useParams<{ requestHash: string }>();
  const theme = useTheme();
  const { data: r, isLoading } = useReservation(requestHash ?? '');
  const { data: miner } = useMinerByHotkey(r?.minerHotkey ?? '');
  const { data: protocol } = useProtocolConstants();
  const { data: chainState } = useChainState();
  const currentBlock = chainState?.currentBlock ?? 0;

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

  const sendToAddr = minerSendToAddress(r.fromChain, miner);

  // Status palette
  const statusColor =
    r.status === 'INITIATED'
      ? theme.palette.status.fulfilled
      : r.status === 'ACTIVE'
        ? theme.palette.status.active
        : theme.palette.status.timedOut;

  // Funds-sent signal: if a validator saw the source tx they would have proposed
  // an extension carrying from_tx_hash, OR an extension already finalized, OR
  // the swap was initiated (which requires the source tx).
  const fundsSeen =
    !!r.pendingExtensionFromTxHash ||
    r.extensionsUsed > 0 ||
    r.status === 'INITIATED';
  const isInitiated = r.status === 'INITIATED';
  const isTerminal = r.status === 'EXPIRED' || r.status === 'CANCELLED';

  const reservedStage: StageState = isTerminal ? 'failed' : 'done';
  const fundsStage: StageState = isTerminal
    ? 'failed'
    : fundsSeen
      ? 'done'
      : 'current';
  const initiatedStage: StageState = isTerminal
    ? 'failed'
    : isInitiated
      ? 'done'
      : fundsSeen
        ? 'current'
        : 'pending';

  const extensionStatus = deriveReservationExtensionStatus(r, protocol);
  const sourceLine =
    r.fromAmount && r.fromChain ? formatAmount(r.fromAmount, r.fromChain) : '—';
  // Destination amount is gross on-chain; deduct the protocol fee so the user
  // sees what they'll actually receive.
  const netToAmount = applyFee(r.toAmount, protocol?.feeDivisor);
  const destLine =
    netToAmount && r.toChain ? formatAmount(netToAmount, r.toChain) : '—';

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

      {/* Lifecycle stepper */}
      <Card>
        <Stack spacing={1.25}>
          <Stage
            state={reservedStage}
            label="Miner reserved"
            detail={`Block #${r.reservedAtBlock} · ${relativeTime(r.createdAt)}`}
          />
          <Stage
            state={fundsStage}
            label="User funds detected"
            detail={
              fundsSeen
                ? r.pendingExtensionFromTxHash
                  ? 'Validator saw your source tx'
                  : 'Confirmed on-chain'
                : isTerminal
                  ? r.status === 'EXPIRED'
                    ? 'Window closed — do not send funds'
                    : 'Reservation cancelled — do not send funds'
                  : 'Awaiting validator confirmation'
            }
          />
          <Stage
            state={initiatedStage}
            label="Swap initiated"
            detail={
              isInitiated
                ? `Quorum confirmed → swap #${r.swapId}`
                : isTerminal
                  ? 'Did not initiate'
                  : 'Pending validator quorum'
            }
          />
        </Stack>
      </Card>

      {/* Action / status guidance */}
      <Card>
        {r.status === 'ACTIVE' && !fundsSeen && (
          <Stack spacing={1}>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Next step
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.85rem',
                color: 'text.primary',
              }}
            >
              Send <strong>{sourceLine}</strong> from your address to the miner
              before block <strong>#{r.reservedUntilBlock}</strong>
              {currentBlock > 0 && (
                <>
                  {' '}
                  (
                  {formatTimeUntilBlock(
                    parseInt(r.reservedUntilBlock, 10),
                    currentBlock,
                  )}{' '}
                  remaining)
                </>
              )}
              .
            </Typography>
            {sendToAddr && (
              <LabelValue label="Send to" value={sendToAddr} copyable />
            )}
            <LabelValue label="Send from" value={r.userFromAddress} copyable />
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: 'text.secondary',
              }}
            >
              Validators reject any source tx whose sender doesn't match — keep
              this address consistent.
            </Typography>
          </Stack>
        )}

        {r.status === 'ACTIVE' && fundsSeen && (
          <Stack spacing={0.5}>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.85rem',
                color: 'text.primary',
              }}
            >
              Validators detected your source transaction.
            </Typography>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.75rem',
                color: 'text.secondary',
              }}
            >
              Awaiting quorum to initiate the swap on-chain — usually a block or
              two.
            </Typography>
          </Stack>
        )}

        {r.status === 'INITIATED' && r.swapId && (
          <Stack spacing={1}>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.85rem',
                color: 'text.primary',
              }}
            >
              Funds received and confirmed. This reservation initiated swap #
              {r.swapId}.
            </Typography>
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
          </Stack>
        )}

        {r.status === 'EXPIRED' && (
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.8rem',
              color: 'text.secondary',
            }}
          >
            Reservation expired before funds were sent. The miner is now free
            for other users — start a new reservation if you still want to swap.
          </Typography>
        )}

        {r.status === 'CANCELLED' && (
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.8rem',
              color: 'text.secondary',
            }}
          >
            Reservation was cancelled before initiating a swap.
          </Typography>
        )}
      </Card>

      {/* Details */}
      <Card>
        <Stack spacing={1.25}>
          <LabelValue label="You send" value={sourceLine} />
          <LabelValue label="You receive" value={destLine} />
          <LabelValue
            label="Miner"
            value={
              miner?.uid !== undefined
                ? `UID ${miner.uid} · ${r.minerHotkey}`
                : r.minerHotkey
            }
            copyable
          />
          <LabelValue
            label="Reserved until"
            value={
              r.status === 'ACTIVE' && currentBlock > 0
                ? `Block #${r.reservedUntilBlock} (${formatTimeUntilBlock(parseInt(r.reservedUntilBlock, 10), currentBlock)} remaining)`
                : `Block #${r.reservedUntilBlock}`
            }
          />
          {(extensionStatus.kind !== 'none' || r.extensionsUsed > 0) && (
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
            </Stack>
          )}
        </Stack>
      </Card>
    </PageWrapper>
  );
};

const Stage: React.FC<{
  state: StageState;
  label: string;
  detail: string;
}> = ({ state, label, detail }) => {
  const theme = useTheme();
  const Icon =
    state === 'done'
      ? CheckCircleIcon
      : state === 'current'
        ? HourglassEmptyIcon
        : state === 'failed'
          ? CancelIcon
          : RadioButtonUncheckedIcon;
  const color =
    state === 'done'
      ? theme.palette.status.completed
      : state === 'current'
        ? theme.palette.status.active
        : state === 'failed'
          ? theme.palette.status.timedOut
          : theme.palette.text.disabled;
  const labelColor =
    state === 'pending'
      ? theme.palette.text.secondary
      : theme.palette.text.primary;
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={{ xs: 0.25, sm: 1.5 }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Icon sx={{ fontSize: 18, color }} />
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.8rem',
            color: labelColor,
            fontWeight: state === 'current' ? 600 : 400,
            minWidth: { sm: 180 },
          }}
        >
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.7rem',
          color: 'text.secondary',
          pl: { xs: 4, sm: 0 },
        }}
      >
        {detail}
      </Typography>
    </Stack>
  );
};

export default ReservationDetailPage;
