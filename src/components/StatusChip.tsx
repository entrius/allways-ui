import React from 'react';
import { Box, alpha } from '@mui/material';
import { FONTS } from '../theme';
import RailTooltip from './dashboard/railTooltip';

/**
 * The site's one status chip: mono, uppercase, square, a 1px border in the
 * status colour over a faint tint of it, text in the same colour. The tape,
 * the detail pages and miner detail all render their states through this,
 * so a COMPLETED on one page is the COMPLETED on every page.
 *
 * `color` is any CSS colour (a palette hex, a `var(--color-…)`); a palette
 * token like `text.disabled` is resolved through the theme by the caller.
 */
const StatusChip: React.FC<{
  label: React.ReactNode;
  color: string;
  /** A small mark before the label (a dot, a check, an icon). */
  icon?: React.ReactNode;
  /** Quiet trailing note, e.g. "· as of 03:32 PM", in the muted colour. */
  note?: React.ReactNode;
  hint?: React.ReactNode;
}> = ({ label, color, icon, note, hint }) => {
  const isVar = color.startsWith('var(');
  const chip = (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1,
        py: 0.4,
        fontFamily: FONTS.mono,
        fontSize: '0.65rem',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        color,
        border: '1px solid',
        // CSS variables cannot be alpha-blended in JS; fall back to
        // color-mix so the tint still follows the colour.
        borderColor: isVar
          ? `color-mix(in srgb, ${color} 40%, transparent)`
          : alpha(color, 0.4),
        backgroundColor: isVar
          ? `color-mix(in srgb, ${color} 8%, transparent)`
          : alpha(color, 0.08),
        cursor: hint ? 'help' : 'default',
      }}
    >
      {icon}
      {label}
      {note && (
        <Box
          component="span"
          sx={{ color: 'text.disabled', fontWeight: 400, ml: 0.25 }}
        >
          {note}
        </Box>
      )}
    </Box>
  );
  return hint ? (
    <RailTooltip title={hint} placement="top">
      {chip}
    </RailTooltip>
  ) : (
    chip
  );
};

export default StatusChip;
