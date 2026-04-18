import React, { useState } from 'react';
import { IconButton, Link, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { FONTS } from '../theme';
import { getExplorerUrl, type ExplorerType } from '../utils/explorer';

const shortAddr = (addr: string) =>
  addr.length > 10 ? `${addr.slice(0, 4)}..${addr.slice(-4)}` : addr;

interface CopyableAddressProps {
  address: string;
  chain?: string | null;
  type?: ExplorerType;
  display?: string;
  fontSize?: string;
  color?: string;
  showCopy?: boolean;
}

const CopyableAddress: React.FC<CopyableAddressProps> = ({
  address,
  chain,
  type = 'address',
  display,
  fontSize = '0.7rem',
  color = 'text.secondary',
  showCopy = true,
}) => {
  const [copied, setCopied] = useState(false);
  const explorerUrl = getExplorerUrl(chain, type, address);
  const text = display ?? shortAddr(address);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const label = explorerUrl ? (
    <Link
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      sx={{
        fontFamily: FONTS.mono,
        fontSize,
        color,
        textDecoration: 'none',
        '&:hover': { textDecoration: 'underline', color: 'primary.main' },
      }}
    >
      {text}
    </Link>
  ) : (
    <Typography
      component="span"
      sx={{ fontFamily: FONTS.mono, fontSize, color }}
    >
      {text}
    </Typography>
  );

  return (
    <Tooltip title={copied ? 'Copied!' : address} arrow placement="top">
      <Stack
        component="span"
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ display: 'inline-flex', verticalAlign: 'baseline' }}
      >
        {label}
        {showCopy && (
          <IconButton
            onClick={handleCopy}
            size="small"
            aria-label="Copy to clipboard"
            sx={{
              p: 0.25,
              color: 'text.secondary',
              fontSize,
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'transparent',
              },
            }}
          >
            {copied ? (
              <CheckIcon sx={{ fontSize: '1.3em' }} />
            ) : (
              <ContentCopyIcon sx={{ fontSize: '1.3em' }} />
            )}
          </IconButton>
        )}
      </Stack>
    </Tooltip>
  );
};

export default CopyableAddress;
