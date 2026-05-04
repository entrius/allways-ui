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
import { BlockIndicator, Card, LabelValue, PageWrapper } from '../components';
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

type TimelineStep = {
  label: string;
  block: string | null;
  timestamp: string | null;
  done: boolean;
  failed: boolean;
};

const getStatusColor = (
  status: string,
  palette: { status: Record<string, string> },
): string => {
  const map: Record<string, string> = {
    ACTIVE: palette.status.active,
    FULFILLED: palette.status.fulfilled,
    COMPLETED: palette.status.completed,
    TIMED_OUT: palette.status.timedOut,
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

  const steps: TimelineStep[] = [
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

      <Card>
        <Typography
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.8rem',
            color: 'text.primary',
          }}
        >
          {swap.status === 'ACTIVE' &&
            "Awaiting miner fulfillment — they're sending the destination funds now. Validators will mark it FULFILLED once the destination tx confirms."}
          {swap.status === 'FULFILLED' &&
            'Miner delivered the destination funds. Validators are voting to confirm on-chain — once quorum lands, the swap completes.'}
          {swap.status === 'COMPLETED' && 'Exchange completed.'}
          {swap.status === 'TIMED_OUT' &&
            (refundPending
              ? 'Miner did not deliver in time. Slash is pending — user must claim the refund on-chain with `alw claim`.'
              : "Miner did not deliver in time. The slashed collateral was paid directly to the user's address.")}
        </Typography>
      </Card>

      {/* Summary */}
      {swap.sourceChain && swap.destChain && (
        <Card>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            {swap.sourceAmount && swap.sourceChain && (
              <LabelValue
                label="User sends"
                value={formatAmount(swap.sourceAmount, swap.sourceChain)}
              />
            )}
            {swap.destAmount &&
              swap.destChain &&
              (() => {
                const net = applyFee(swap.destAmount, protocol?.feeDivisor);
                return net ? (
                  <LabelValue
                    label="User receives"
                    value={formatAmount(net, swap.destChain)}
                  />
                ) : null;
              })()}
            {(() => {
              const rate = formatRateLine(
                swap.sourceAmount,
                swap.sourceChain,
                swap.destAmount,
                swap.destChain,
              );
              return rate ? <LabelValue label="Rate" value={rate} /> : null;
            })()}
          </Stack>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <SectionTitle>Timeline</SectionTitle>
        <Stack spacing={1.5}>
          {steps.map((step) => {
            const stepColor = step.done
              ? 'var(--color-status-completed)'
              : step.failed
                ? 'var(--color-status-timed-out)'
                : 'text.secondary';
            return (
              <Stack
                key={step.label}
                direction="row"
                alignItems="center"
                spacing={1.5}
              >
                <Typography
                  sx={{
                    fontSize: '0.9rem',
                    width: 16,
                    textAlign: 'center',
                    color: stepColor,
                  }}
                >
                  {step.done ? '\u25CF' : step.failed ? '\u2717' : '\u25CB'}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.75rem',
                    color: stepColor,
                    fontWeight: step.done ? 600 : 400,
                    minWidth: 80,
                  }}
                >
                  {step.label}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.7rem',
                    color: step.done ? stepColor : 'text.secondary',
                  }}
                >
                  {step.block ? `Block #${step.block}` : '\u2014'}
                </Typography>
              </Stack>
            );
          })}
          {/* Timeout line */}
          {swap.timeoutBlock && (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography
                sx={{ fontSize: '0.9rem', width: 16, textAlign: 'center' }}
              >
                {isTimedOut ? '\u23F1' : '\u23F1'}
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.75rem',
                  color: isTimedOut ? 'error.main' : 'text.secondary',
                  fontWeight: isTimedOut ? 600 : 400,
                  minWidth: 80,
                }}
              >
                Timeout
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                }}
              >
                Block #{swap.timeoutBlock}
                {!isTimedOut &&
                  swap.status !== 'COMPLETED' &&
                  currentBlock > 0 && (
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
              </Typography>
            </Stack>
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

      {/* Transactions */}
      {(swap.sourceTxHash || swap.destTxHash) && (
        <Card>
          <SectionTitle>Transactions</SectionTitle>
          <Stack spacing={1}>
            <LabelValue
              label="Source TX"
              value={swap.sourceTxHash || '\u2014'}
              copyable={!!swap.sourceTxHash}
            />
            <LabelValue
              label="Dest TX"
              value={swap.destTxHash || '\u2014'}
              copyable={!!swap.destTxHash}
            />
          </Stack>
        </Card>
      )}

      {/* Transaction flow */}
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
        // Source/dest amounts are populated by the watcher async; the TAO leg
        // is always present via taoAmount, so fall back to that when the
        // chain-specific column hasn't been backfilled yet.
        const sentAmount =
          swap.sourceAmount && swap.sourceChain
            ? formatAmount(swap.sourceAmount, swap.sourceChain)
            : taoSource && swap.taoAmount
              ? formatAmount(swap.taoAmount, 'tao')
              : null;
        const grossRecv =
          swap.destAmount ?? (!taoSource ? swap.taoAmount : null);
        const recvChain = swap.destChain ?? (!taoSource ? 'tao' : null);
        const netRecv = applyFee(grossRecv, protocol?.feeDivisor);
        const recvAmount =
          netRecv && recvChain ? formatAmount(netRecv, recvChain) : null;
        return (
          <>
            {(sentAmount || sentFrom || sentTo) && (
              <Card>
                <SectionTitle>User sends</SectionTitle>
                <Stack spacing={1}>
                  {sentAmount && (
                    <LabelValue label="Amount" value={sentAmount} />
                  )}
                  {sentFrom && (
                    <LabelAddr label="From user" address={sentFrom} />
                  )}
                  {sentTo && <LabelAddr label="To miner" address={sentTo} />}
                </Stack>
              </Card>
            )}
            {(recvAmount || recvFrom || recvTo) && (
              <Card>
                <SectionTitle>User receives</SectionTitle>
                <Stack spacing={1}>
                  {recvAmount && (
                    <LabelValue label="Amount" value={recvAmount} />
                  )}
                  {recvFrom && (
                    <LabelAddr label="From miner" address={recvFrom} />
                  )}
                  {recvTo && <LabelAddr label="To user" address={recvTo} />}
                </Stack>
              </Card>
            )}
          </>
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
                  #{event.blockNumber}
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

/* ---- Shared sub-components ---- */

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Typography
    sx={{
      fontFamily: FONTS.mono,
      fontSize: '0.7rem',
      fontWeight: 600,
      color: 'text.secondary',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      mb: 1.5,
    }}
  >
    {children}
  </Typography>
);

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
