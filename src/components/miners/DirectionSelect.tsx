import React from 'react';
import { MenuItem, Select, useTheme } from '@mui/material';
import {
  useDirections,
  directionLabel,
  isDirection,
  type Direction,
} from '../../api';
import { FONTS } from '../../theme';

const ALL_PAIRS = 'all';

// The page's one direction picker — a compact mono Select. Replaced the
// ToggleButtonGroup wall, which grew a button per direction and wrapped
// across the panel once the chain registry passed a handful of pairs.
const DirectionSelect: React.FC<{
  value: Direction | null;
  onChange: (d: Direction | null) => void;
  // With allowAll, null renders as an "All pairs" option; without it, null is
  // not selectable and onChange always yields a Direction.
  allowAll?: boolean;
  width?: number;
}> = ({ value, onChange, allowAll = false, width = 150 }) => {
  const theme = useTheme();
  const directions = useDirections();
  return (
    <Select
      size="small"
      value={value ?? (allowAll ? ALL_PAIRS : '')}
      onChange={(e) => {
        const v = e.target.value as string;
        onChange(isDirection(v) ? v : null);
      }}
      sx={{
        width,
        height: 30,
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        color: 'text.primary',
        borderRadius: 0,
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.border.light,
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: 'primary.main',
        },
      }}
    >
      {allowAll && (
        <MenuItem
          value={ALL_PAIRS}
          sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}
        >
          All pairs
        </MenuItem>
      )}
      {directions.map((d) => (
        <MenuItem
          key={d}
          value={d}
          sx={{ fontFamily: FONTS.mono, fontSize: '0.7rem' }}
        >
          {directionLabel(d)}
        </MenuItem>
      ))}
    </Select>
  );
};

export default DirectionSelect;
