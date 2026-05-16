import React from 'react';
import { Box, Stack } from '@mui/material';
import { FONTS } from '../../theme';
import CrownIcon from './CrownIcon';
import type { CellState } from './crownGridCells';

const HoverLine: React.FC<{
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}> = ({ label, value, valueColor }) => (
  <Stack direction="row" spacing={1.5} alignItems="baseline">
    <Box
      sx={{
        width: 38,
        color: 'text.secondary',
        fontSize: '0.6rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Box>
    <Box sx={{ color: valueColor ?? 'text.primary', fontWeight: 500 }}>
      {value}
    </Box>
  </Stack>
);

// Hovering a cell positions this card relative to the grid's `position:
// relative` parent. `x`/`y` are the cell center relative to that parent.
const CrownGridHoverCard: React.FC<{
  hover: { cell: CellState; x: number; y: number };
  isDark: boolean;
}> = ({ hover, isDark }) => {
  const { cell, x, y } = hover;
  const bg = isDark ? 'rgba(8,10,14,0.97)' : 'rgba(255,255,255,0.98)';
  const border = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(9,11,13,0.18)';
  const shadow = isDark
    ? '0 12px 28px -8px rgba(0,0,0,0.7)'
    : '0 12px 28px -8px rgba(9,11,13,0.25)';
  const dotBg =
    cell.color ?? (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(9,11,13,0.22)');
  return (
    <Box
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, calc(-100% - 10px))',
        pointerEvents: 'none',
        zIndex: 10,
        minWidth: 168,
        backgroundColor: bg,
        border: '1px solid',
        borderColor: border,
        borderRadius: '4px',
        boxShadow: shadow,
        backdropFilter: 'blur(10px)',
        px: 1.5,
        py: 1.25,
        fontFamily: FONTS.mono,
        fontSize: '0.78rem',
        color: 'text.primary',
        animation: 'crownHoverIn 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
        '@keyframes crownHoverIn': {
          from: { opacity: 0, transform: 'translate(-50%, calc(-100% - 4px))' },
          to: { opacity: 1, transform: 'translate(-50%, calc(-100% - 10px))' },
        },
      }}
    >
      <Stack spacing={0.6}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {cell.holderHotkey ? (
            <Box
              sx={{
                width: 10,
                height: 10,
                backgroundColor: dotBg,
                border: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
              }}
            />
          ) : (
            <Box sx={{ width: 10, height: 10, flexShrink: 0 }} />
          )}
          {cell.holderHotkey ? (
            <Box
              component="span"
              sx={{ fontWeight: 600, color: 'primary.main' }}
            >
              uid {cell.holderUid ?? '?'}
            </Box>
          ) : (
            <Box component="span" sx={{ color: 'text.disabled' }}>
              no holder
            </Box>
          )}
          {cell.holderHotkey && (
            <Box
              component="span"
              sx={{
                ml: 'auto',
                fontSize: '0.65rem',
                color: 'text.disabled',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <CrownIcon size={11} sx={{ color: dotBg, mr: 0 }} />
              crown
            </Box>
          )}
        </Stack>
        <HoverLine label="block" value={`#${cell.block.toLocaleString()}`} />
        {cell.holderHotkey && (
          <HoverLine label="rate" value={cell.rate.toFixed(2)} />
        )}
        {cell.isTie && (
          <HoverLine
            label="status"
            valueColor={isDark ? '#ffcf66' : '#b45309'}
            value="tied"
          />
        )}
        {cell.isCurrent && (
          <HoverLine
            label="status"
            valueColor="text.secondary"
            value="pending"
          />
        )}
      </Stack>
    </Box>
  );
};

export default CrownGridHoverCard;
