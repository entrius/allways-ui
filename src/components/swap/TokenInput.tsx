import React from 'react';
import { Stack, TextField, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { FONTS } from '../../theme';

export interface TokenInputProps {
  label: string;
  symbol: string;
  balance: string;
  amount?: string;
  readOnly?: boolean;
}

const TokenInput: React.FC<TokenInputProps> = ({
  label,
  symbol,
  balance,
  amount = '0.0',
  readOnly = true,
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
    </Stack>
  </Stack>
);

export default TokenInput;
