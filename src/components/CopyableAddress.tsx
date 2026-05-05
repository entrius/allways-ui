import React, { useState } from 'react';
import { Tooltip, Typography } from '@mui/material';
import { FONTS } from '../theme';

const shortAddr = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 4)}..${addr.slice(-4)}` : addr;

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

  const handleClick = (e: React.MouseEvent) => {
    // Prevent enclosing <a> / RouterLink from navigating when the address is
    // nested inside a clickable card.
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip
      title={copied ? 'Copied!' : address}
      arrow
      placement="top"
      slotProps={{
        tooltip: {
          sx: {
            // Address-specific overrides on top of the global tooltip theme:
            // never wrap a single address across lines.
            fontFamily: FONTS.mono,
            whiteSpace: 'nowrap',
            maxWidth: 'none',
          },
        },
      }}
    >
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
