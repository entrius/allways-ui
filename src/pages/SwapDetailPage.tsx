import React from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Chip,
  Stack,
  Typography,
  CircularProgress,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  displayEventType,
  useMinerByHotkey,
  useProtocolConstants,
  useReservation,
  useSwapDetail,
} from '../api';
import { FONTS } from '../theme';
import CopyableAddress from '../components/CopyableAddress';
import {
  BlockIndicator,
  Card,
  LabelValue,
  PageWrapper,
  SectionTitle,
  TimelineStep,
  type TimelineStepState,
} from '../components';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  applyFee,
  formatAmount,
  formatCountdown,
  formatRateLine,
  formatUnixTime,
  explorerSignatureUrl,
  lamportsToSol,
  swapDisplayId,
} from '../utils/format';
import { type ContractEvent } from '../api/models';
import ExtensionChip, {
  deriveSwapExtensionStatus,
} from '../components/ExtensionChip';

type SwapStep = {
  label: string;
  // Unix-seconds timestamp of the step, or null if it hasn't happened.
  at: string | null;
  done: boolean;
  failed: boolean;
};

const getStatusColor = (
  status: string,
  palette: { status: Record<string, string> },
): string => {
  // Terminal states pop with semantic color — completion green / timeout red.
  // In-flight states keep their muted blue tints.
  const map: Record<string, string> = {
    ACTIVE: palette.status.active,
    FULFILLED: palette.status.fulfilled,
    COMPLETED: 'var(--color-success)',
    TIMED_OUT: 'var(--color-danger)',
  };
  return map[status] ?? palette.status.active;
};

const SwapDetailPage: React.FC = () => {
  const { swapId } = useParams<{ swapId: string }>();
  const theme = useTheme();

  const { data, isLoading } = useSwapDetail(swapId ?? '');
  const { data: protocol } = useProtocolConstants();
  const { data: miner } = useMinerByHotkey(data?.swap?.minerHotkey ?? '');
  // While the swap is live its reservation still exists and carries the
  // user's PROVEN source-chain wallet (validators verified the deposit
  // sender against it). Pruned after settlement.
  const { data: reservation } = useReservation(
    data?.swap?.reservationRequestHash ?? '',
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  const swap = data?.swap;
  const events = data?.events ?? [];

  if (!swap) {
    return (
      <PageWrapper>
        <Typography sx={{ fontFamily: FONTS.mono, color: 'text.secondary' }}>
          Transaction {swapId} not found
        </Typography>
      </PageWrapper>
    );
  }

  const statusColor = getStatusColor(swap.status, theme.palette);
  const isTimedOut = swap.status === 'TIMED_OUT';
  const refundEvent: ContractEvent | undefined = isTimedOut
    ? events.find(
        (e) =>
          e.eventType === 'CollateralSlashed' || e.eventType === 'SlashPending',
      )
    : undefined;
  const refundPending = refundEvent?.eventType === 'SlashPending';

  const steps: SwapStep[] = [
    {
      label: 'Initiated',
      at: swap.initiatedAt,
      done: true,
      failed: false,
    },
    {
      label: 'Fulfilled',
      at: swap.fulfilledAt,
      done: !!swap.fulfilledAt,
      failed: isTimedOut && !swap.fulfilledAt,
    },
    {
      label: 'Completed',
      at: swap.completedAt ?? swap.resolvedAt,
      done: swap.status === 'COMPLETED',
      failed: isTimedOut,
    },
  ];

  return (
    <PageWrapper>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Typography
          component={RouterLink}
          to="/transactions"
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
          <ArrowBackIcon sx={{ fontSize: 14 }} /> Transactions
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Chip
          label={swap.status.replace('_', ' ')}
          size="small"
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            fontWeight: 600,
            borderRadius: 0,
            borderColor: statusColor,
            color: statusColor,
          }}
          variant="outlined"
        />
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3, flexWrap: 'wrap', rowGap: 0.5 }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontWeight: 900,
            fontSize: { xs: '1.15rem', sm: '1.5rem' },
            color: 'text.primary',
          }}
        >
          Transaction {swapDisplayId(swap)}
        </Typography>
        <BlockIndicator />
      </Stack>

      {swap.reservationRequestHash && (
        <Typography
          component={RouterLink}
          to={`/reservations/${swap.reservationRequestHash}`}
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.75rem',
            color: 'text.secondary',
            textDecoration: 'none',
            display: 'inline-block',
            mb: 2,
            '&:hover': { color: 'primary.main' },
          }}
        >
          ← View original reservation
        </Typography>
      )}

      {/* Miner identity — UID + hotkey, mirrors the reservation page */}
      {swap.minerHotkey && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="baseline"
          sx={{ mb: 3, flexWrap: 'wrap' }}
        >
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
              UID {miner.uid} ·
            </Typography>
          )}
          <CopyableAddress
            address={swap.minerHotkey}
            fontSize="0.75rem"
            color="text.primary"
          />
        </Stack>
      )}

      {/* Trade summary — the lead, not a card */}
      {(() => {
        const sourceLine =
          swap.sourceAmount && swap.sourceChain
            ? formatAmount(swap.sourceAmount, swap.sourceChain)
            : null;
        const net = applyFee(swap.destAmount, protocol?.feeDivisor);
        const destLine =
          net && swap.destChain ? formatAmount(net, swap.destChain) : null;
        const rate = formatRateLine(
          swap.sourceAmount,
          swap.sourceChain,
          swap.destAmount,
          swap.destChain,
        );
        // One-sided headlines look awkward; only render when both legs known.
        // Single amounts still appear per-leg in the Flow card below.
        if (!sourceLine || !destLine) return null;
        return (
          <Stack spacing={0.5} sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: { xs: '1.05rem', sm: '1.4rem' },
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
            {rate && (
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.8rem',
                  color: 'text.secondary',
                }}
              >
                {rate}
              </Typography>
            )}
          </Stack>
        );
      })()}

      {/* Status helper — skip COMPLETED (chip already says it) */}
      {swap.status !== 'COMPLETED' && (
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.8rem',
            color: 'text.secondary',
            mb: 3,
            lineHeight: 1.5,
          }}
        >
          {swap.status === 'ACTIVE' &&
            "Awaiting miner fulfillment — they're sending the destination funds now. Validators will mark it FULFILLED once the destination tx confirms."}
          {swap.status === 'FULFILLED' &&
            'Miner delivered the destination funds. Validators are voting to confirm on-chain — once quorum lands, the swap completes.'}
          {swap.status === 'TIMED_OUT' &&
            (refundPending
              ? 'Miner did not deliver in time. Slash is pending — user must claim the refund on-chain with `alw claim`.'
              : "Miner did not deliver in time. The slashed collateral was paid directly to the user's address.")}
        </Typography>
      )}

      {/* Timeline */}
      <Card>
        <SectionTitle>Timeline</SectionTitle>
        <Stack spacing={1.5}>
          {/* Hide Completed row on timed-out swaps \u2014 it never completed.
              Hide Timeout row on completed swaps \u2014 it never fired. */}
          {/* Hide Completed row on timed-out swaps \u2014 it never completed.
              Hide Timeout row on completed swaps \u2014 it never fired.
              Only the terminal row that actually fired carries semantic
              color (green \u2713 for success, red \u2717 for timeout); other
              "done" rows stay neutral so the eye lands on finality. */}
          {steps
            .filter((s) => !(isTimedOut && s.label === 'Completed'))
            .map((step) => {
              const stepState: TimelineStepState = step.done
                ? 'done'
                : step.failed
                  ? 'failed'
                  : 'pending';
              const isTerminalCompleted =
                step.label === 'Completed' && step.done;
              return (
                <TimelineStep
                  key={step.label}
                  state={stepState}
                  glyph={isTerminalCompleted ? '\u2713' : undefined}
                  color={
                    isTerminalCompleted ? 'var(--color-success)' : undefined
                  }
                  label={step.label}
                  detail={step.at ? formatUnixTime(step.at) : '\u2014'}
                />
              );
            })}
          {swap.timeoutAt && swap.status !== 'COMPLETED' && (
            <TimelineStep
              state={isTimedOut ? 'failed' : 'pending'}
              glyph={isTimedOut ? undefined : '\u23F1'}
              color={isTimedOut ? 'var(--color-danger)' : undefined}
              label="Timeout"
              detail={
                <>
                  {formatUnixTime(swap.timeoutAt)}
                  {!isTimedOut && (
                    <> ({formatCountdown(swap.timeoutAt)} remaining)</>
                  )}
                </>
              }
            />
          )}
          {swap.timeoutAt && !isTimedOut && swap.status !== 'COMPLETED' && (
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.65rem',
                color: 'text.secondary',
                pl: 4,
                lineHeight: 1.4,
              }}
            >
              Timeout may extend if validators need additional time to safely
              confirm the destination tx.
            </Typography>
          )}
          {(() => {
            const ext = deriveSwapExtensionStatus(swap);
            if (ext.kind === 'none') return null;
            return (
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
                <ExtensionChip status={ext} />
              </Stack>
            );
          })()}
        </Stack>
      </Card>

      {/* Refund (timed-out slash) */}
      {refundEvent && (
        <Card>
          <SectionTitle>Refund</SectionTitle>
          <Stack spacing={1}>
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.75rem',
                color: refundPending ? 'warning.main' : 'success.main',
              }}
            >
              {refundPending
                ? 'Slash pending — user must claim on-chain with `alw claim`.'
                : 'Slash paid directly from network collateral to user.'}
            </Typography>
            {refundEvent.solAmount && (
              <LabelValue
                label="Amount"
                value={`${lamportsToSol(refundEvent.solAmount).toFixed(4)} SOL`}
              />
            )}
            {(refundEvent.userAddress ?? refundEvent.actorPubkey) && (
              <LabelAddr
                label="Recipient"
                address={
                  (refundEvent.userAddress ?? refundEvent.actorPubkey) as string
                }
              />
            )}
            {refundEvent.signature && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="baseline"
                sx={{ flexWrap: 'wrap' }}
              >
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.7rem',
                    color: 'text.secondary',
                    minWidth: 80,
                  }}
                >
                  Signature
                </Typography>
                <Typography
                  component="a"
                  href={explorerSignatureUrl(refundEvent.signature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.75rem',
                    color: 'primary.main',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {refundEvent.signature.slice(0, 8)}…
                  <OpenInNewIcon sx={{ fontSize: 12 }} />
                </Typography>
              </Stack>
            )}
          </Stack>
        </Card>
      )}

      {/* Flow \u2014 sends and receives in one card, each with its own tx hash */}
      {(() => {
        // Resolve "from" / "to" addresses for each leg from the user's POV.
        // Every leg uses an address pinned on-chain at initiation, so the
        // resolution is direction-independent and provably correct:
        //   user sends source funds  → miner's source-chain address (deposit)
        //   miner sends dest funds    → user's dest-chain address
        // The miner hotkey is the subnet identity, never a funds address (TAO
        // settles from the miner's coldkey), so it is not used here.
        // "From" is the wallet the source funds actually came from: the
        // explicit per-leg field, else the reservation's proven from-wallet,
        // else — only when the source leg IS Solana — the protocol address.
        // A non-SOL source leg with no proven wallet shows no From at all
        // rather than a protocol address masquerading as one.
        const sentFrom =
          swap.userSourceAddress ??
          reservation?.userFromAddress ??
          (swap.sourceChain?.toLowerCase() === 'sol' ? swap.userAddress : null);
        const sentTo = swap.minerSourceAddress;
        const recvFrom = swap.minerDestAddress;
        // Same chain-aware rule as the sending leg: the protocol (SOL)
        // address only stands in for the receive "To" when the dest leg IS
        // Solana. A non-SOL destination with no explicit address shows no To
        // rather than a Solana address masquerading as one.
        const recvTo =
          swap.userDestAddress ??
          (swap.destChain?.toLowerCase() === 'sol' ? swap.userAddress : null);
        const sentAmount =
          swap.sourceAmount && swap.sourceChain
            ? formatAmount(swap.sourceAmount, swap.sourceChain)
            : null;
        // Promised destination obligation (top of the Receives card); the
        // amount the miner actually delivered is shown alongside it below.
        const netRecv = applyFee(swap.destAmount, protocol?.feeDivisor);
        const recvAmount =
          netRecv && swap.destChain
            ? formatAmount(netRecv, swap.destChain)
            : null;
        const deliveredAmount =
          swap.deliveredAmount && swap.destChain
            ? formatAmount(swap.deliveredAmount, swap.destChain)
            : null;
        // Slippage the user accepted: how far the delivered fill fell below the promised quote.
        const slippagePct =
          netRecv && swap.deliveredAmount
            ? ((Number(netRecv) - Number(swap.deliveredAmount)) /
                Number(netRecv)) *
              100
            : null;
        const slippageLabel =
          slippagePct !== null && slippagePct > 0.01
            ? `${slippagePct.toFixed(2)}%`
            : null;
        const hasSend = !!(
          sentAmount ||
          sentFrom ||
          sentTo ||
          swap.sourceTxHash
        );
        const hasRecv = !!(
          recvAmount ||
          deliveredAmount ||
          recvFrom ||
          recvTo ||
          swap.destTxHash
        );
        if (!hasSend && !hasRecv) return null;
        return (
          <Card>
            <Stack spacing={2.5}>
              {hasSend && (
                <Stack spacing={1}>
                  <SectionTitle>
                    Sends
                    {swap.sourceChain
                      ? ` · ${swap.sourceChain.toUpperCase()}`
                      : ''}
                  </SectionTitle>
                  {sentAmount && (
                    <LabelValue label="Amount" value={sentAmount} />
                  )}
                  {sentFrom && <LabelAddr label="From" address={sentFrom} />}
                  {sentTo && <LabelAddr label="To" address={sentTo} />}
                  {swap.sourceTxHash && (
                    <LabelValue label="Tx" value={swap.sourceTxHash} copyable />
                  )}
                </Stack>
              )}
              {hasRecv && (
                <Stack spacing={1}>
                  <SectionTitle>
                    Receives
                    {swap.destChain ? ` · ${swap.destChain.toUpperCase()}` : ''}
                  </SectionTitle>
                  {recvAmount && (
                    <LabelValue label="Promised" value={recvAmount} />
                  )}
                  {deliveredAmount && (
                    <LabelValue label="Delivered" value={deliveredAmount} />
                  )}
                  {slippageLabel && (
                    <LabelValue label="Slippage" value={slippageLabel} />
                  )}
                  {recvFrom && <LabelAddr label="From" address={recvFrom} />}
                  {recvTo && <LabelAddr label="To" address={recvTo} />}
                  {swap.destTxHash && (
                    <LabelValue label="Tx" value={swap.destTxHash} copyable />
                  )}
                </Stack>
              )}
            </Stack>
          </Card>
        );
      })()}

      {/* Details — the raw identifiers behind the swap */}
      <Card>
        <SectionTitle>Details</SectionTitle>
        <Stack spacing={1}>
          {swap.userAddress && (
            <LabelAddr label="User" address={swap.userAddress} />
          )}
          {swap.swapKey && (
            <LabelValue label="Swap key" value={swap.swapKey} copyable />
          )}
          <LabelValue label="Internal ID" value={swap.swapId} copyable />
          {swap.solAmount && (
            <LabelValue
              label="SOL notional"
              value={`${lamportsToSol(swap.solAmount).toFixed(4)} SOL`}
            />
          )}
          {swap.reservationRequestHash && (
            <LabelValue
              label="Reservation"
              value={swap.reservationRequestHash}
              copyable
            />
          )}
        </Stack>
      </Card>

      {/* Event History */}
      {events.length > 0 && (
        <Card>
          <SectionTitle>Event History</SectionTitle>
          <Stack spacing={1}>
            {events.map((event) => (
              <Stack
                key={event.id}
                direction="row"
                spacing={{ xs: 1, sm: 1.5 }}
                rowGap={0.5}
                alignItems="center"
                flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
                useFlexGap
              >
                <Chip
                  label={displayEventType(event)}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.6rem',
                    height: 20,
                    borderRadius: 0,
                    width: { xs: 150, sm: 220 },
                    borderColor: theme.palette.border.light,
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
                {/* Exact wall-clock time of the event, then the slot. */}
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.65rem',
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {event.blockTime ? formatUnixTime(event.blockTime) : '—'}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.65rem',
                    color: 'text.secondary',
                  }}
                >
                  #{event.slot}
                </Typography>
                {event.solAmount && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      color: 'primary.main',
                    }}
                  >
                    {lamportsToSol(event.solAmount).toFixed(4)} SOL
                  </Typography>
                )}
                {event.txHash && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    tx: {event.txHash.slice(0, 10)}...
                  </Typography>
                )}
                {event.signature && (
                  <Typography
                    component="a"
                    href={explorerSignatureUrl(event.signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      color: 'primary.main',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.25,
                      whiteSpace: 'nowrap',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    sig: {event.signature.slice(0, 8)}…
                    <OpenInNewIcon sx={{ fontSize: 10 }} />
                  </Typography>
                )}
              </Stack>
            ))}
          </Stack>
        </Card>
      )}
    </PageWrapper>
  );
};

/* ---- Page-local sub-components ---- */

const LabelAddr: React.FC<{ label: string; address: string }> = ({
  label,
  address,
}) => (
  <Stack direction="row" spacing={1} alignItems="baseline">
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: { xs: '0.62rem', sm: '0.7rem' },
        color: 'text.secondary',
        minWidth: { xs: 62, sm: 80 },
        flexShrink: 0,
      }}
    >
      {label}
    </Typography>
    <CopyableAddress address={address} fontSize="0.75rem" />
  </Stack>
);

export default SwapDetailPage;
