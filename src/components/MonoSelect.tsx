import React, { useState } from 'react';
import { Box, Menu, MenuItem } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { FONTS } from '../theme';

/**
 * The app's compact dropdown for a small set of choices — a mono chip
 * showing the current value with a caret, opening a menu of the options.
 * Used where a row of chips would spend more width than the choice is
 * worth (precision, time range).
 */
const MonoSelect = <T extends string | number | null>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  /** Accessible name for the control. */
  label: string;
}): React.ReactElement => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current = options.find((o) => o.value === value)?.label ?? '';
  return (
    <>
      <Box
        component="button"
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e: React.MouseEvent<HTMLElement>) =>
          setAnchor(e.currentTarget)
        }
        sx={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.25,
          pl: 1,
          pr: 0.5,
          py: 0.4,
          fontFamily: FONTS.mono,
          fontSize: '0.65rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        {current}
        <KeyboardArrowDownIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
      </Box>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        {options.map((o) => (
          <MenuItem
            key={String(o.value)}
            selected={o.value === value}
            onClick={() => {
              onChange(o.value);
              setAnchor(null);
            }}
            sx={{
              fontFamily: FONTS.mono,
              fontSize: '0.68rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontVariantNumeric: 'tabular-nums',
              minHeight: 0,
              py: 0.6,
            }}
          >
            {o.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default MonoSelect;
