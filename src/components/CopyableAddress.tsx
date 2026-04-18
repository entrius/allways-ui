import React, { useState } from 'react';
import { Tooltip, Typography } from '@mui/material';
import { FONTS } from '../theme';
import { shortAddr } from '../utils/format';

interface CopyableAddressProps {
  address: string;
  fontSize?: string;
  color?: string;
}

const CopyableAddress: React.FC<CopyableAddressProps> = ({
  address,
  fontSize = '0.7rem',
  color = 'text.secondary',
}) => {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip title={copied ? 'Copied!' : address} arrow placement="top">
      <Typography
        component="span"
        onClick={handleClick}
        sx={{
          fontFamily: FONTS.mono,
          fontSize,
          color,
          cursor: 'pointer',
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        {shortAddr(address)}
      </Typography>
    </Tooltip>
  );
};

export default CopyableAddress;
