import React from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { useMinerByHotkey, useProtocolConstants, useReservation } from '../api';
import type { Miner } from '../api/models';
import { FONTS } from '../theme';
import {
  applyFee,
  explorerTxUrl,
  formatAmount,
  formatCountdown,
  formatTimeAgo,
  formatUnixTime,
  formatWallClock,
  normalizeTxHash,
} from '../utils/format';
import {
  BlockIndicator,
  Card,
  CopyableAddress,
  LabelValue,
  PageIntro,
  PageWrapper,
  SectionTitle,
  StatusChip,
  TimelineStep,
  type TimelineStepState,
} from '../components';
import ExtensionChip, {
  deriveReservationExtensionStatus,
} from '../components/ExtensionChip';
import { assetLabel } from '../api/models/chains';

const minerSendToAddress = (
  fromChain: string | null,
  miner: Miner | undefined,
): string | null => {
  if (!miner || !fromChain) return null;
  if (miner.sourceChain === fromChain) return miner.sourceAddress;
  if (miner.destChain === fromChain) return miner.destAddress;
  return null;
};

const ReservationDetailPage: React.FC = () => {
  const { requestHash } = useParams<{ requestHash: string }>();
  const theme = useTheme();
  const { data: r, isLoading } = useReservation(requestHash ?? '');
  const { data: miner } = useMinerByHotkey(r?.minerHotkey ?? '');
  const { data: protocol } = useProtocolConstants();

  if (isLoading) {
    return (
      <PageWrapper>
        <Skeleton variant="text" width={120} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={360} height={48} sx={{ mb: 4 }} />
        <Skeleton variant="rectangular" height={180} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={240} />
      </PageWrapper>
    );
  }

  if (!r) {
    return (
      <PageWrapper>
        <PageIntro
          back={{ to: '/network#transactions', label: 'Transactions' }}
          eyebrow="Reservation"
          title="Not found."
          lead={`No reservation matches ${requestHash}. Reservations are pruned after they settle, so a finished one lives on as its transaction.`}
        />
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

  const reservedStage: TimelineStepState = isTerminal ? 'failed' : 'done';
  // Funds + confirmation collapse into one step: send → detect → confirm.
  // 'active' covers both "user still needs to send" and "send detected,
  // awaiting confirmations" — the visual signal is identical and the
  // step `detail` text disambiguates.
  const sendConfirmStage: TimelineStepState = isTerminal
    ? 'failed'
    : isInitiated
      ? 'done'
      : 'active';
  const initiatedStage: TimelineStepState = isTerminal
    ? 'failed'
    : isInitiated
      ? 'done'
      : 'pending';

  const extensionStatus = deriveReservationExtensionStatus(r);
  const sourceLine =
    r.fromAmount && r.fromChain ? formatAmount(r.fromAmount, r.fromChain) : '—';
  // Destination amount is gross on-chain; deduct the protocol fee so the user
  // sees what they'll actually receive.
  const netToAmount = applyFee(r.toAmount, protocol?.feeDivisor);
  const destLine =
    netToAmount && r.toChain ? formatAmount(netToAmount, r.toChain) : '—';

  return (
    <PageWrapper>
      <PageIntro
        back={{ to: '/network#transactions', label: 'Transactions' }}
        eyebrow="Reservation"
        title={
          <>
            {sourceLine}
            <Box
              component="span"
              sx={{ color: 'text.disabled', mx: { xs: 1, md: 1.5 } }}
            >
              →
            </Box>
            {destLine}
          </>
        }
        lead={
          isInitiated && r.swapId ? (
            <Typography
              component={RouterLink}
              to={`/swap/${r.swapId}`}
              sx={{
                display: 'inline-block',
                fontFamily: FONTS.mono,
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main' },
              }}
            >
              Funded · view swap →
            </Typography>
          ) : (
            <Box
              component="span"
              sx={{
                display: 'block',
                fontFamily: FONTS.mono,
                fontSize: '0.8rem',
                color: 'text.secondary',
              }}
            >
              {r.status === 'ACTIVE' && !fundsSeen
                ? `Awaiting funds · ${formatCountdown(r.reservedUntil)} remaining`
                : r.status === 'ACTIVE' && fundsSeen
                  ? 'Funds detected · confirming'
                  : r.status === 'EXPIRED'
                    ? 'Expired before funds were sent'
                    : r.status === 'CANCELLED'
                      ? 'Cancelled before initiating'
                      : ''}
            </Box>
          )
        }
        aside={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <StatusChip label={r.status} color={statusColor} />
            <BlockIndicator />
          </Stack>
        }
        mb={{ xs: 3, md: 4 }}
      />

      {/* Status helper — mirrors SwapDetailPage so reservation/swap pages read consistently */}
      {r.status === 'ACTIVE' && fundsSeen && (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.8rem',
            color: 'text.secondary',
            mb: 3,
            lineHeight: 1.5,
          }}
        >
          Awaiting source-tx confirmations to verify legitimacy before
          initiating the swap. The reservation may extend up to 2× while
          validators wait for chain finality.
        </Typography>
      )}

      {/* Lifecycle stepper */}
      <Card>
        <SectionTitle>Timeline</SectionTitle>
        <Stack spacing={1.5}>
          <TimelineStep
            labelMinWidth={120}
            state={reservedStage}
            label="Reserved"
            detail={`${formatWallClock(r.reservedAt, { seconds: true })} · ${formatTimeAgo(Math.floor(new Date(r.createdAt).getTime() / 1000))}`}
          />
          <TimelineStep
            labelMinWidth={120}
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
                    : 'send funds to the miner'
            }
          />
          <TimelineStep
            labelMinWidth={120}
            state={initiatedStage}
            label="Swap initiated"
            detail={
              isInitiated
                ? 'quorum confirmed → swap initiated'
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
              Send <strong>{sourceLine}</strong> from the source address before{' '}
              <strong>{formatUnixTime(r.reservedUntil)}</strong> (
              {formatCountdown(r.reservedUntil)}).
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
              Validators confirm within a few minutes.
            </Typography>
          </Stack>
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
            {miner?.uid != null && (
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
            {miner?.uid != null && (
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
          {r.fromChain && r.toChain && (
            <LabelValue
              label="Route"
              value={`${assetLabel(r.fromChain)} → ${assetLabel(r.toChain)}`}
            />
          )}
          <LabelValue label="Amount in" value={sourceLine} />
          <LabelValue label="Amount out" value={destLine} />
          <LabelValue label="Send from" value={r.userFromAddress} copyable />
          {sendToAddr && (
            <LabelValue label="Send to" value={sendToAddr} copyable />
          )}
          {r.pendingExtensionFromTxHash && (
            <LabelValue
              label="Source tx"
              value={normalizeTxHash(r.fromChain, r.pendingExtensionFromTxHash)}
              href={
                explorerTxUrl(r.fromChain, r.pendingExtensionFromTxHash) ??
                undefined
              }
              copyable
            />
          )}
          <LabelValue label="Request" value={r.requestHash} copyable />
          <LabelValue
            label="Window"
            value={
              r.status === 'ACTIVE'
                ? `${formatUnixTime(r.reservedAt)} → ${formatUnixTime(r.reservedUntil)} (${formatCountdown(r.reservedUntil)} left)`
                : `${formatUnixTime(r.reservedAt)} → ${formatUnixTime(r.reservedUntil)}`
            }
          />
          {r.extensionsUsed > 0 && (
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

export default ReservationDetailPage;
