import React from 'react';
import { Stack, Typography } from '@mui/material';
import { FONTS } from '../theme';
import CopyableAddress from './CopyableAddress';

const LabelValue: React.FC<{
  label: string;
  value: string;
  copyable?: boolean;
}> = ({ label, value, copyable }) => (
  <Stack direction="row" spacing={1} alignItems="baseline">
    <Typography
      sx={{
        fontFamily: FONTS.mono,
        fontSize: '0.7rem',
        color: 'text.secondary',
        minWidth: 80,
      }}
    >
      {label}
    </Typography>
    {copyable ? (
      <CopyableAddress address={value} fontSize="0.75rem" />
    ) : (
      <Typography
        sx={{ fontFamily: FONTS.mono, fontSize: '0.75rem', color: 'text.primary' }}
      >
        {value}
      </Typography>
    )}
  </Stack>
);

export default LabelValue;
