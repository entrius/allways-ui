import React from 'react';
import { Box, Stack, TableCell, type SxProps, type Theme } from '@mui/material';
import { FONTS } from '../../theme';

export type SortDir = 'asc' | 'desc';

// Generic over the consumer's SortKey union. The caller owns the union,
// passes the current active key + dir, and gets a click/Enter/Space-driven
// sort toggle with the right aria-sort wiring.
function SortHeader<K extends string>({
  label,
  sortKey,
  active,
  dir,
  onSort,
  sx,
}: {
  label: string;
  sortKey: K;
  active: K;
  dir: SortDir;
  onSort: (k: K) => void;
  // Extra cell styling — e.g. responsive display for columns that fold away
  // on narrow viewports.
  sx?: SxProps<Theme>;
}) {
  const isActive = active === sortKey;
  return (
    <TableCell
      onClick={() => onSort(sortKey)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(sortKey);
        }
      }}
      tabIndex={0}
      role="button"
      aria-sort={
        isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'
      }
      sx={[
        {
          cursor: 'pointer',
          userSelect: 'none',
          color: isActive ? 'text.primary' : undefined,
          '&:hover': { color: 'text.primary' },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <span>{label}</span>
        <Box
          component="span"
          sx={{
            fontFamily: FONTS.mono,
            fontSize: '0.65rem',
            color: isActive ? 'primary.main' : 'text.disabled',
            opacity: isActive ? 1 : 0.4,
          }}
        >
          {isActive ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </Box>
      </Stack>
    </TableCell>
  );
}

export default SortHeader;
