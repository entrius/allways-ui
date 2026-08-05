import React, { useState } from 'react';
import { Box } from '@mui/material';
import { FONTS } from '../theme';
import { chainInfo, hubChain } from '../api/models/chains';

// Logo PNGs are served by das (same assets as its OG cards); the registry
// entry carries the path. Unknown chains — or a failed image load — fall back
// to a lettered disc so layouts never break.
const logoSrc = (chain: string): string | undefined => {
  const path = chainInfo(chain)?.logo;
  if (!path) return undefined;
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
  return baseUrl ? `${baseUrl}${path}` : path;
};

export const ChainLogo: React.FC<{ chain: string; size?: number }> = ({
  chain,
  size = 16,
}) => {
  const [failed, setFailed] = useState(false);
  const key = chain.toLowerCase();
  const src = logoSrc(key);
  if (!src || failed)
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: 'action.hover',
          color: 'text.secondary',
          fontFamily: FONTS.mono,
          fontSize: size * 0.55,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {key.charAt(0).toUpperCase()}
      </Box>
    );
  return (
    <Box
      component="img"
      src={src}
      alt={key.toUpperCase()}
      onError={() => setFailed(true)}
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'block',
        flexShrink: 0,
      }}
    />
  );
};

// One asset mention: the logo immediately before its ticker text. The single
// site-wide rule — wherever a ticker symbol is written, it is written through
// this. Typography (font, size, color) inherits from the parent so it drops
// into any label context.
export const TickerSymbol: React.FC<{ chain: string; logoSize?: number }> = ({
  chain,
  logoSize = 14,
}) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      whiteSpace: 'nowrap',
      verticalAlign: 'baseline',
    }}
  >
    <ChainLogo chain={chain} size={logoSize} />
    {chain.toUpperCase()}
  </Box>
);

// "⟠ SOL ⇄ ₿ BTC" — a pair name, each ticker carrying its own logo.
export const PairLabel: React.FC<{ spoke: string; logoSize?: number }> = ({
  spoke,
  logoSize = 15,
}) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.6,
      whiteSpace: 'nowrap',
    }}
  >
    <TickerSymbol chain={hubChain()} logoSize={logoSize} />
    <Box component="span" sx={{ color: 'text.disabled' }}>
      ⇄
    </Box>
    <TickerSymbol chain={spoke} logoSize={logoSize} />
  </Box>
);
