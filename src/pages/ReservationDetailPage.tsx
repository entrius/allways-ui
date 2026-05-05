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
import {
  BlockIndicator,
  Card,
  CopyableAddress,
  LabelValue,
  PageWrapper,
} from '../components';
import ExtensionChip, {
  deriveReservationExtensionStatus,
} from '../components/ExtensionChip';

type StageState = 'done' | 'current' | 'awaiting' | 'pending' | 'failed';

const minerSendToAddress = (
  fromChain: string | null,
  miner: Miner | undefined,
): string | null => {
  if (!miner || !fromChain) return null;
  if (miner.sourceChain === fromChain) return miner.sourceAddress;
  if (miner.destChain === fromChain) return miner.destAddress;
  return null;
};

const fmtBlock = (b: string | number): string =>
  Number(b).toLocaleString('en-US');

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
  // Funds + confirmation collapse into one step: send → detect → confirm.
  // 'awaiting' = user owes the send; 'current' = detected, waiting on conf
  // blocks; 'done' = confirmed (which is what INITIATED requires).
  const sendConfirmStage: StageState = isTerminal
    ? 'failed'
    : isInitiated
      ? 'done'
      : fundsSeen
        ? 'current'
        : 'awaiting';
  const initiatedStage: StageState = isTerminal
    ? 'failed'
    : isInitiated
      ? 'done'
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

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 1 }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontWeight: 900,
            fontSize: '1.5rem',
            color: 'text.primary',
          }}
        >
          Reservation
        </Typography>
        <BlockIndicator />
      </Stack>

      {/* Trade summary — the lead, not a card */}
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '1.4rem',
            fontWeight: 600,
            color: 'text.primary',
            letterSpacing: '-0.5px',
          }}
        >
          {sourceLine}{' '}
          <Box
            component="span"
            sx={{ color: 'text.secondary', mx: 0.5, fontWeight: 400 }}
          >
            →
          </Box>{' '}
          {destLine}
        </Typography>
        {isInitiated && r.swapId ? (
          <Typography
            component={RouterLink}
            to={`/swap/${r.swapId}`}
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.85rem',
              color: 'primary.main',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Funded · Swap #{r.swapId}{' '}
            <ArrowForwardIcon sx={{ fontSize: 14 }} />
          </Typography>
        ) : (
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.85rem',
              color: 'text.secondary',
            }}
          >
            {r.status === 'ACTIVE' && !fundsSeen
              ? `Awaiting funds${
                  currentBlock > 0
                    ? ` · ${formatTimeUntilBlock(parseInt(r.reservedUntilBlock, 10), currentBlock)} remaining`
                    : ''
                }`
              : r.status === 'ACTIVE' && fundsSeen
                ? 'Funds detected · confirming'
                : r.status === 'EXPIRED'
                  ? 'Expired before funds were sent'
                  : r.status === 'CANCELLED'
                    ? 'Cancelled before initiating'
                    : ''}
          </Typography>
        )}
      </Stack>

      {/* Lifecycle stepper */}
      <Card>
        <Stack spacing={1.25}>
          <Stage
            state={reservedStage}
            label="Reserved"
            detail={`Block ${fmtBlock(r.reservedAtBlock)} · ${relativeTime(r.createdAt)}`}
          />
          <Stage
            state={sendConfirmStage}
            label="Funds received"
            detail={
              isInitiated
                ? 'source tx confirmed'
                : fundsSeen
                  ? 'detected — awaiting confirmations'
                  : isTerminal
                    ? r.status === 'EXPIRED'
                      ? 'window closed before send'
                      : 'cancelled before send'
                    : 'send funds to the miner — usually within a block'
            }
          />
          <Stage
            state={initiatedStage}
            label="Swap initiated"
            detail={
              isInitiated
                ? `quorum confirmed → Swap #${r.swapId}`
                : isTerminal
                  ? 'did not initiate'
                  : 'pending validator quorum'
            }
          />
        </Stack>
      </Card>

      {/* Action / status guidance — only when ACTIVE; header subline covers other states */}
      {r.status === 'ACTIVE' && !fundsSeen && (
        <Card>
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
              Send <strong>{sourceLine}</strong> from the source address before
              block <strong>{fmtBlock(r.reservedUntilBlock)}</strong>.
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
              Validators usually pick up the send within a block. The sender
              address must match — mismatched txs are rejected.
            </Typography>
          </Stack>
        </Card>
      )}

      {r.status === 'ACTIVE' && fundsSeen && (
        <Card>
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.75rem',
              color: 'text.secondary',
            }}
          >
            Awaiting source-tx confirmations to verify legitimacy before
            initiating the swap. The reservation may extend up to 2× while
            validators wait for chain finality.
          </Typography>
        </Card>
      )}

      {/* Details */}
      <Card>
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} alignItems="baseline">
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                color: 'text.secondary',
                minWidth: 80,
              }}
            >
              Miner
            </Typography>
            {miner?.uid !== undefined && (
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.75rem',
                  color: 'text.primary',
                }}
              >
                UID {miner.uid}
              </Typography>
            )}
            {miner?.uid !== undefined && (
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.75rem',
                  color: 'text.disabled',
                }}
              >
                ·
              </Typography>
            )}
            <CopyableAddress
              address={r.minerHotkey}
              fontSize="0.75rem"
              color="text.primary"
            />
          </Stack>
          <LabelValue
            label="Window"
            value={
              r.status === 'ACTIVE' && currentBlock > 0
                ? `${fmtBlock(r.reservedAtBlock)} → ${fmtBlock(r.reservedUntilBlock)} (${formatTimeUntilBlock(parseInt(r.reservedUntilBlock, 10), currentBlock)} left)`
                : `${fmtBlock(r.reservedAtBlock)} → ${fmtBlock(r.reservedUntilBlock)}`
            }
          />
          {(extensionStatus.kind !== 'none' || r.extensionsUsed > 0) && (
            <Stack spacing={0.75}>
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
              {extensionStatus.kind === 'pending' && (
                <>
                  <LabelValue
                    label="Proposed"
                    value={`+${extensionStatus.target - parseInt(r.reservedUntilBlock, 10)} blocks → ${fmtBlock(extensionStatus.target)}`}
                  />
                  <LabelValue
                    label="Finalizes"
                    value={
                      currentBlock > 0
                        ? `Block ${fmtBlock(extensionStatus.finalizableAt)} (~${formatTimeUntilBlock(extensionStatus.finalizableAt, currentBlock)}) if uncontested`
                        : `Block ${fmtBlock(extensionStatus.finalizableAt)} if uncontested`
                    }
                  />
                  {extensionStatus.proposedBy && (
                    <LabelValue
                      label="Proposed by"
                      value={extensionStatus.proposedBy}
                      copyable
                    />
                  )}
                </>
              )}
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
        : state === 'awaiting'
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
            fontWeight: state === 'current' || state === 'awaiting' ? 600 : 400,
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
