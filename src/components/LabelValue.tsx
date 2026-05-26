import React from 'react';
import { Link, Stack, Typography } from '@mui/material';
import { FONTS } from '../theme';
import CopyableAddress from './CopyableAddress';

const LabelValue: React.FC<{
  label: string;
  value: string;
  copyable?: boolean;
  href?: string;
}> = ({ label, value, copyable, href }) => (
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
    {href ? (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ fontFamily: FONTS.mono, fontSize: '0.75rem' }}
      >
        {value}
      </Link>
    ) : copyable ? (
      <CopyableAddress address={value} fontSize="0.75rem" />
    ) : (
      <Typography
        sx={{
          fontFamily: FONTS.mono,
          fontSize: '0.75rem',
          color: 'text.primary',
        }}
      >
        {value}
      </Typography>
    )}
  </Stack>
);

export default LabelValue;
