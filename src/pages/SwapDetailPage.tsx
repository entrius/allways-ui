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
  useChainState,
  useProtocolConstants,
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
  formatRateLine,
  formatTimeUntilBlock,
  explorerExtrinsicUrl,
  extrinsicRef,
} from '../utils/format';
import { type ContractEvent } from '../api/models';
import ExtensionChip, {
  deriveSwapExtensionStatus,
} from '../components/ExtensionChip';

type SwapStep = {
  label: string;
  block: string | null;
  timestamp: string | null;
  done: boolean;
  failed: boolean;
};

const fmtBlock = (b: string | number): string =>
  Number(b).toLocaleString('en-US');

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
  const { data: chainState } = useChainState();
  const currentBlock = chainState?.currentBlock ?? 0;

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
          Transaction #{swapId} not found
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
      block: swap.initiatedBlock,
      timestamp: swap.initiatedAt,
      done: true,
      failed: false,
    },
    {
      label: 'Fulfilled',
      block: swap.fulfilledBlock,
      timestamp: swap.fulfilledAt,
      done: !!swap.fulfilledAt,
      failed: isTimedOut && !swap.fulfilledAt,
    },
    {
      label: 'Completed',
      block: swap.completedBlock,
      timestamp: swap.resolvedAt,
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
        sx={{ mb: 3 }}
      >
        <Typography
          sx={{
            fontFamily: FONTS.heading,
            fontWeight: 900,
            fontSize: '1.5rem',
            color: 'text.primary',
          }}
        >
          Transaction #{swap.swapId}
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
                  detail={step.block ? `Block ${fmtBlock(step.block)}` : '\u2014'}
                />
              );
            })}
          {swap.timeoutBlock && swap.status !== 'COMPLETED' && (
            <TimelineStep
              state={isTimedOut ? 'failed' : 'pending'}
              glyph={isTimedOut ? undefined : '\u23F1'}
              color={isTimedOut ? 'var(--color-danger)' : undefined}
              label="Timeout"
              detail={
                <>
                  Block {fmtBlock(swap.timeoutBlock)}
                  {!isTimedOut && currentBlock > 0 && (
                    <>
                      {' '}
                      (
                      {formatTimeUntilBlock(
                        parseInt(swap.timeoutBlock),
                        currentBlock,
                      )}{' '}
                      remaining)
                    </>
                  )}
                </>
              }
            />
          )}
          {swap.timeoutBlock && !isTimedOut && swap.status !== 'COMPLETED' && (
            <Typography
              sx={{
                fontFamily: FONTS.mono,
                fontSize: '0.65rem',
                color: 'text.secondary',
                pl: 4,
                lineHeight: 1.4,
              }}
            >
              Timeout may extend if validators need additional blocks to safely
              confirm the destination tx.
            </Typography>
          )}
          {(() => {
            const ext = deriveSwapExtensionStatus(swap, protocol);
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
            {refundEvent.taoAmount && (
              <LabelValue
                label="Amount"
                value={`${parseFloat(refundEvent.taoAmount).toFixed(4)} TAO`}
              />
            )}
            {(refundEvent.address ?? refundEvent.userAddress) && (
              <LabelAddr
                label="Recipient"
                address={
                  (refundEvent.address ?? refundEvent.userAddress) as string
                }
              />
            )}
            {refundEvent.extrinsicIndex !== null && (
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
                  Extrinsic
                </Typography>
                <Typography
                  component="a"
                  href={explorerExtrinsicUrl(
                    refundEvent.blockNumber,
                    refundEvent.extrinsicIndex,
                  )}
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
                  {extrinsicRef(
                    refundEvent.blockNumber,
                    refundEvent.extrinsicIndex,
                  )}
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
        // sourceChain === 'tao': user sends TAO from their hotkey → miner hotkey;
        //                       miner sends BTC from minerSourceAddress → user's BTC addr.
        // sourceChain === 'btc': user sends BTC from userSourceAddress → minerSourceAddress;
        //                       miner sends TAO from miner hotkey → user's TAO hotkey.
        const taoSource = swap.sourceChain?.toLowerCase() === 'tao';
        const sentFrom = taoSource ? swap.userAddress : swap.userSourceAddress;
        const sentTo = taoSource ? swap.minerHotkey : swap.minerSourceAddress;
        const recvFrom = taoSource ? swap.minerSourceAddress : swap.minerHotkey;
        const recvTo = taoSource
          ? swap.userDestAddress
          : (swap.userDestAddress ?? swap.userAddress);
        const sentAmount =
          swap.sourceAmount && swap.sourceChain
            ? formatAmount(swap.sourceAmount, swap.sourceChain)
            : null;
        const netRecv = applyFee(swap.destAmount, protocol?.feeDivisor);
        const recvAmount =
          netRecv && swap.destChain
            ? formatAmount(netRecv, swap.destChain)
            : null;
        const hasSend = !!(sentAmount || sentFrom || sentTo || swap.sourceTxHash);
        const hasRecv = !!(recvAmount || recvFrom || recvTo || swap.destTxHash);
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
                    <LabelValue
                      label="Tx"
                      value={swap.sourceTxHash}
                      copyable
                    />
                  )}
                </Stack>
              )}
              {hasRecv && (
                <Stack spacing={1}>
                  <SectionTitle>
                    Receives
                    {swap.destChain
                      ? ` · ${swap.destChain.toUpperCase()}`
                      : ''}
                  </SectionTitle>
                  {recvAmount && (
                    <LabelValue label="Amount" value={recvAmount} />
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

      {/* Event History */}
      {events.length > 0 && (
        <Card>
          <SectionTitle>Event History</SectionTitle>
          <Stack spacing={1}>
            {events.map((event) => (
              <Stack
                key={event.id}
                direction="row"
                spacing={1.5}
                alignItems="center"
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
                    width: 220,
                    borderColor: theme.palette.border.light,
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.65rem',
                    color: 'text.secondary',
                  }}
                >
                  {fmtBlock(event.blockNumber)}
                </Typography>
                {event.taoAmount && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      color: 'primary.main',
                    }}
                  >
                    {parseFloat(event.taoAmount).toFixed(4)} TAO
                  </Typography>
                )}
                {event.voteType && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                    }}
                  >
                    {event.voteType}
                    {event.voteCount !== null ? ` (${event.voteCount})` : ''}
                  </Typography>
                )}
                {event.txHash && (
                  <Typography
                    sx={{
                      fontFamily: FONTS.mono,
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                    }}
                  >
                    tx: {event.txHash.slice(0, 10)}...
                  </Typography>
                )}
                {event.extrinsicIndex !== null && (
                  <Typography
                    component="a"
                    href={explorerExtrinsicUrl(
                      event.blockNumber,
                      event.extrinsicIndex,
                    )}
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
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    ex: {extrinsicRef(event.blockNumber, event.extrinsicIndex)}
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
        fontSize: '0.7rem',
        color: 'text.secondary',
        minWidth: 80,
      }}
    >
      {label}
    </Typography>
    <CopyableAddress address={address} fontSize="0.75rem" />
  </Stack>
);

export default SwapDetailPage;
