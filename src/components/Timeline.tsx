import React from 'react';
import { Stack, Typography, useTheme } from '@mui/material';
import { FONTS } from '../theme';

export type TimelineStepState = 'done' | 'active' | 'pending' | 'failed';

const STATE_GLYPH: Record<TimelineStepState, string> = {
  done: '●', // ●
  failed: '✗', // ✗
  active: '○', // ○
  pending: '○', // ○
};

export const TimelineStep: React.FC<{
  state: TimelineStepState;
  label: string;
  detail?: React.ReactNode;
  /**
   * Override the default glyph (e.g. '⏱' for a Timeout row).
   */
  glyph?: string;
  /**
   * Override the state-derived color. Use sparingly — reserved for
   * terminal "finality" rows that need to pop (e.g. green ✓ on a
   * completed swap, red ✗ on a timed-out swap).
   */
  color?: string;
  /**
   * Default 80 — bump if labels in your timeline are wordier.
   */
  labelMinWidth?: number;
}> = ({ state, label, detail, glyph, color, labelMinWidth = 80 }) => {
  const theme = useTheme();
  const stepColor =
    color ??
    (state === 'done'
      ? theme.palette.status.completed
      : state === 'failed'
        ? theme.palette.status.timedOut
        : state === 'active'
          ? theme.palette.status.active
          : theme.palette.text.secondary);
  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Typography
        sx={{
          fontSize: '0.9rem',
          width: 16,
          textAlign: 'center',
          color: stepColor,
        }}
      >
        {glyph ?? STATE_GLYPH[state]}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.75rem',
          color: stepColor,
          fontWeight: state === 'done' ? 600 : 400,
          minWidth: labelMinWidth,
        }}
      >
        {label}
      </Typography>
      {detail != null && detail !== '' && (
        <Typography
          component="div"
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.7rem',
            color: 'text.secondary',
          }}
        >
          {detail}
        </Typography>
      )}
    </Stack>
  );
};

export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
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
