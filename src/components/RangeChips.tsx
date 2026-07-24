import React from 'react';
import { Box, useTheme } from '@mui/material';
import { FONTS } from '../theme';

/**
 * The app's one lookback/window selector — borderless mono chips with an
 * inverted (paper-on-text) active state, as introduced on the markets hero
 * chart. Every time-range picker renders through this so the treatment stays
 * identical across pages.
 */
const RangeChips = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
}): React.ReactElement => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {options.map((r) => (
        <Box
          key={r}
          component="button"
          onClick={() => onChange(r)}
          aria-pressed={value === r}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            fontFamily: FONTS.mono,
            fontSize: '0.65rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            px: 1,
            py: 0.4,
            fontWeight: 600,
            color:
              value === r
                ? theme.palette.background.paper
                : theme.palette.text.secondary,
            backgroundColor:
              value === r ? theme.palette.text.primary : 'transparent',
            '&:hover': {
              backgroundColor:
                value === r
                  ? theme.palette.text.primary
                  : theme.palette.action.hover,
            },
          }}
        >
          {r}
        </Box>
      ))}
    </Box>
  );
};

export default RangeChips;
