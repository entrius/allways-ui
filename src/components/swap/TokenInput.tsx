import React from 'react';
import { Stack, TextField, Typography, MenuItem, Select } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { FONTS } from '../../theme';

export interface TokenInputProps {
  label: string;
  symbol: string;
  balance: string;
  amount?: string;
  readOnly?: boolean;
  onAmountChange?: (value: string) => void;
  symbolOptions?: string[];
  onSymbolChange?: (next: string) => void;
}

const TokenInput: React.FC<TokenInputProps> = ({
  label,
  symbol,
  balance,
  amount = '0.0',
  readOnly = true,
  onAmountChange,
  symbolOptions,
  onSymbolChange,
}) => (
  <Stack
    sx={{
      p: 2,
      border: '1px solid',
      borderColor: 'divider',
      gap: 1,
    }}
  >
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.65rem',
          color: 'text.secondary',
        }}
      >
        Balance: {balance}
      </Typography>
    </Stack>
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <TextField
        value={amount}
        onChange={
          onAmountChange ? (e) => onAmountChange(e.target.value) : undefined
        }
        variant="standard"
        InputProps={{
          disableUnderline: true,
          readOnly,
          sx: {
            fontFamily: FONTS.mono,
            fontSize: '1.75rem',
            fontWeight: 600,
          },
        }}
        sx={{ flex: 1 }}
      />
      {symbolOptions && onSymbolChange ? (
        <Select
          value={symbol}
          variant="standard"
          disableUnderline
          onChange={(e) => onSymbolChange(String(e.target.value))}
          sx={{
            px: 1.25,
            py: 0.25,
            border: '1px solid',
            borderColor: 'divider',
            fontFamily: FONTS.mono,
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '0.05em',
            '& .MuiSelect-select': { paddingRight: '24px !important' },
          }}
        >
          {symbolOptions.map((opt) => (
            <MenuItem key={opt} value={opt} sx={{ fontFamily: FONTS.mono }}>
              {opt}
            </MenuItem>
          ))}
        </Select>
      ) : (
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{
            px: 1.25,
            py: 0.75,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            sx={{
              fontFamily: FONTS.mono,
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
            }}
          >
            {symbol}
          </Typography>
          <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
        </Stack>
      )}
    </Stack>
  </Stack>
);

export default TokenInput;
