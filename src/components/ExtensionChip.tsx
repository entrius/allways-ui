import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { FONTS } from '../theme';
import { formatUnixTime } from '../utils/format';

// Extensions apply instantly (single-validator on the v2 contract) — there is
// no pending/challenge state. `deadline` is the already-extended unix-seconds
// deadline (timeoutAt / reservedUntil).
export type ExtensionStatus =
  | { kind: 'none' }
  | { kind: 'applied'; used: number; deadline: number | null };

const parseTs = (v: string | null): number | null => {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

export const deriveSwapExtensionStatus = (s: {
  timeoutExtensionsUsed: number;
  timeoutAt: string | null;
}): ExtensionStatus => {
  if (s.timeoutExtensionsUsed <= 0) return { kind: 'none' };
  return { kind: 'applied', used: s.timeoutExtensionsUsed, deadline: parseTs(s.timeoutAt) };
};

export const deriveReservationExtensionStatus = (r: {
  extensionsUsed: number;
  reservedUntil: string;
}): ExtensionStatus => {
  if (r.extensionsUsed <= 0) return { kind: 'none' };
  return { kind: 'applied', used: r.extensionsUsed, deadline: parseTs(r.reservedUntil) };
};

const ExtensionChip: React.FC<{ status: ExtensionStatus }> = ({ status }) => {
  if (status.kind === 'none') return null;

  const chip = (
    <Chip
      label={`Extended ×${status.used}`}
      size="small"
      variant="outlined"
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.65rem',
        height: 18,
        borderRadius: 0,
        color: 'text.secondary',
        borderColor: 'text.disabled',
      }}
    />
  );

  if (status.deadline == null) return chip;
  return (
    <Tooltip
      title={`New deadline: ${formatUnixTime(status.deadline)}`}
      arrow
      placement="top"
    >
      {chip}
    </Tooltip>
  );
};

export default ExtensionChip;
