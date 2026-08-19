import React from 'react';
import {
  InputAdornment,
  TextField,
  useTheme,
  type SxProps,
  type Theme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { FONTS } from '../theme';

/**
 * The app's one text-input treatment: mono, square, sitting on the page
 * ground with a hairline border that goes solid foreground once the field
 * carries a value, and a primary outline on focus. Exported on its own for
 * the sibling filter fields — dates, amount bounds — that share a row with
 * a search box and have to read as the same control.
 */
export const terminalFieldSx = (theme: Theme, active?: boolean) => ({
  '& .MuiOutlinedInput-root': {
    fontFamily: FONTS.mono,
    fontSize: '0.65rem',
    color: 'text.primary',
    borderRadius: 0,
    height: 28,
    backgroundColor: 'background.default',
    '& fieldset': {
      borderColor: active ? theme.palette.text.primary : theme.palette.divider,
      ...(active && { borderWidth: 2 }),
    },
    '&:hover fieldset': {
      borderColor: active
        ? theme.palette.text.primary
        : theme.palette.border.light,
    },
    '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
  },
  '& .MuiOutlinedInput-input': { py: 0 },
});

/**
 * Every search box in the app. One shape, one height, one magnifier — the
 * transactions tape, the miner leaderboard, the rates table and the
 * reservations lookup all render this, so a search field is recognisable as
 * one wherever it turns up.
 */
const SearchField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Accessible name for the fields with no visible label above them. */
  ariaLabel?: string;
  fullWidth?: boolean;
  autoFocus?: boolean;
  /** Width / flex only — the field's own treatment is not overridable. */
  sx?: SxProps<Theme>;
}> = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
  fullWidth,
  autoFocus,
  sx,
}) => {
  const theme = useTheme();
  return (
    <TextField
      size="small"
      fullWidth={fullWidth}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputProps={{ 'aria-label': ariaLabel ?? placeholder }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          </InputAdornment>
        ),
      }}
      sx={{ ...terminalFieldSx(theme, !!value), ...sx }}
    />
  );
};

export default SearchField;
