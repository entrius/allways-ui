import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { FONTS } from '../theme';

const shortAddr = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 4)}..${addr.slice(-4)}` : addr;

const getExplorerUrl = (value: string, chain?: string, type: 'address' | 'tx' = 'address'): string | null => {
  const c = chain?.toLowerCase();
  if (c === 'btc') {
    return type === 'tx'
      ? `https://www.blockchain.com/btc/tx/${value}`
      : `https://www.blockchain.com/btc/address/${value}`;
  }
  if (c === 'tao') {
    return type === 'tx'
      ? `https://taostats.io/extrinsic/${value}`
      : `https://taostats.io/account/${value}`;
  }
  // Hotkeys (ss58) — default to taostats
  if (!c && value.length === 48) return `https://taostats.io/account/${value}`;
  return null;
};

interface CopyableAddressProps {
  address: string;
  fontSize?: string;
  color?: string;
  chain?: string;
  type?: 'address' | 'tx';
}

const CopyableAddress: React.FC<CopyableAddressProps> = ({
  address,
  fontSize = '0.7rem',
  color = 'text.secondary',
  chain,
  type = 'address',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const explorerUrl = getExplorerUrl(address, chain, type);

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={address} arrow placement="top">
        {explorerUrl ? (
          <Typography
            component="a"
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            sx={{
              fontFamily: FONTS.mono,
              fontSize,
              color,
              cursor: 'pointer',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline', color: 'primary.main' },
            }}
          >
            {shortAddr(address)}
          </Typography>
        ) : (
          <Typography
            component="span"
            sx={{
              fontFamily: FONTS.mono,
              fontSize,
              color,
            }}
          >
            {shortAddr(address)}
          </Typography>
        )}
      </Tooltip>
      <Tooltip title={copied ? 'Copied!' : 'Copy'} arrow placement="top">
        <IconButton
          aria-label="Copy address"
          onClick={handleCopy}
          sx={{ p: 0, color }}
        >
          {copied ? (
            <CheckIcon sx={{ fontSize: 12 }} />
          ) : (
            <ContentCopyIcon sx={{ fontSize: 12 }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default CopyableAddress;
