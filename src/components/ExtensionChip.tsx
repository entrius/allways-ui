import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { FONTS } from '../theme';

export type ExtensionStatus =
  | { kind: 'none' }
  | {
      kind: 'pending';
      target: number;
      finalizableAt: number;
      proposedBy: string | null;
    }
  | { kind: 'applied'; used: number; cap: number };

const CHALLENGE_WINDOW_BLOCKS = 8;
const EXTENSION_CAP = 2;

const shortAddr = (a: string | null) =>
  a ? `${a.slice(0, 4)}…${a.slice(-3)}` : 'validator';

export const deriveSwapExtensionStatus = (s: {
  pendingTimeoutExtensionTarget: string | null;
  pendingTimeoutExtensionProposedBlock: string | null;
  pendingTimeoutExtensionProposedBy: string | null;
  timeoutExtensionsUsed: number;
}): ExtensionStatus => {
  if (
    s.pendingTimeoutExtensionTarget &&
    s.pendingTimeoutExtensionProposedBlock
  ) {
    const proposed = parseInt(s.pendingTimeoutExtensionProposedBlock, 10);
    return {
      kind: 'pending',
      target: parseInt(s.pendingTimeoutExtensionTarget, 10),
      finalizableAt: proposed + CHALLENGE_WINDOW_BLOCKS,
      proposedBy: s.pendingTimeoutExtensionProposedBy,
    };
  }
  if (s.timeoutExtensionsUsed > 0)
    return {
      kind: 'applied',
      used: s.timeoutExtensionsUsed,
      cap: EXTENSION_CAP,
    };
  return { kind: 'none' };
};

export const deriveReservationExtensionStatus = (r: {
  pendingExtensionTarget: string | null;
  pendingExtensionProposedBlock: string | null;
  pendingExtensionProposedBy: string | null;
  extensionsUsed: number;
}): ExtensionStatus => {
  if (r.pendingExtensionTarget && r.pendingExtensionProposedBlock) {
    const proposed = parseInt(r.pendingExtensionProposedBlock, 10);
    return {
      kind: 'pending',
      target: parseInt(r.pendingExtensionTarget, 10),
      finalizableAt: proposed + CHALLENGE_WINDOW_BLOCKS,
      proposedBy: r.pendingExtensionProposedBy,
    };
  }
  if (r.extensionsUsed > 0)
    return { kind: 'applied', used: r.extensionsUsed, cap: EXTENSION_CAP };
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
