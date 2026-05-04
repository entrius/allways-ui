import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { FONTS } from '../theme';
import { type ProtocolConstants } from '../api/models';

export type ExtensionStatus =
  | { kind: 'none' }
  | {
      kind: 'pending';
      target: number;
      finalizableAt: number;
      proposedBy: string | null;
    }
  | { kind: 'applied'; used: number; cap: number };

const shortAddr = (a: string | null) =>
  a ? `${a.slice(0, 4)}…${a.slice(-3)}` : 'validator';

export const deriveSwapExtensionStatus = (
  s: {
    pendingTimeoutExtensionTarget: string | null;
    pendingTimeoutExtensionProposedBlock: string | null;
    pendingTimeoutExtensionProposedBy: string | null;
    timeoutExtensionsUsed: number;
  },
  constants: ProtocolConstants | undefined,
): ExtensionStatus => {
  if (!constants) return { kind: 'none' };
  if (
    s.pendingTimeoutExtensionTarget &&
    s.pendingTimeoutExtensionProposedBlock
  ) {
    const proposed = parseInt(s.pendingTimeoutExtensionProposedBlock, 10);
    return {
      kind: 'pending',
      target: parseInt(s.pendingTimeoutExtensionTarget, 10),
      finalizableAt: proposed + constants.challengeWindowBlocks,
      proposedBy: s.pendingTimeoutExtensionProposedBy,
    };
  }
  if (s.timeoutExtensionsUsed > 0)
    return {
      kind: 'applied',
      used: s.timeoutExtensionsUsed,
      cap: constants.maxExtensionsPerSwap,
    };
  return { kind: 'none' };
};

export const deriveReservationExtensionStatus = (
  r: {
    status: string;
    pendingExtensionTarget: string | null;
    pendingExtensionProposedBlock: string | null;
    pendingExtensionProposedBy: string | null;
    extensionsUsed: number;
  },
  constants: ProtocolConstants | undefined,
): ExtensionStatus => {
  if (!constants) return { kind: 'none' };
  // A pending proposal is only meaningful while the reservation can still
  // accept extensions; once it's INITIATED/EXPIRED/CANCELLED the field is
  // historical and should collapse to the applied count.
  if (
    r.status === 'ACTIVE' &&
    r.pendingExtensionTarget &&
    r.pendingExtensionProposedBlock
  ) {
    const proposed = parseInt(r.pendingExtensionProposedBlock, 10);
    return {
      kind: 'pending',
      target: parseInt(r.pendingExtensionTarget, 10),
      finalizableAt: proposed + constants.challengeWindowBlocks,
      proposedBy: r.pendingExtensionProposedBy,
    };
  }
  if (r.extensionsUsed > 0)
    return {
      kind: 'applied',
      used: r.extensionsUsed,
      cap: constants.maxExtensionsPerReservation,
    };
  return { kind: 'none' };
};

const ExtensionChip: React.FC<{ status: ExtensionStatus }> = ({ status }) => {
  if (status.kind === 'none') return null;

  const chipSx = {
    fontFamily: FONTS.mono,
    fontSize: '0.65rem',
    height: 18,
    borderRadius: 0,
  };

  if (status.kind === 'applied') {
    return (
      <Chip
        label={`Extended ${status.used}/${status.cap}`}
        size="small"
        variant="outlined"
        sx={{
          ...chipSx,
          color: 'text.secondary',
          borderColor: 'text.disabled',
        }}
      />
    );
  }

  return (
    <Tooltip
      title={`Proposed by ${shortAddr(status.proposedBy)}. Finalizes at block #${status.finalizableAt} if no challenge.`}
      arrow
      placement="top"
    >
      <Chip
        label={`Extension pending → #${status.target}`}
        size="small"
        variant="outlined"
        sx={{ ...chipSx, color: 'warning.main', borderColor: 'warning.main' }}
      />
    </Tooltip>
  );
};

export default ExtensionChip;
