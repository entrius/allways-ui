import React, { useState } from 'react';
import { Box } from '@mui/material';
import { FONTS } from '../theme';
import { chainInfo } from '../api/models/chains';

// Logo PNGs are served by das (same assets as its OG cards); the registry
// entry carries the path. Unknown chains — or a failed image load — fall back
// to a lettered disc so layouts never break.
const logoSrc = (chain: string): string | undefined => {
  const path = chainInfo(chain)?.logo;
  if (!path) return undefined;
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
  return baseUrl ? `${baseUrl}${path}` : path;
};

// Optical centring, as a fraction of the rendered size.
//
// Most chain logos are a filled disc, so geometric centre and visual centre
// are the same point. A glyph mark is not: TAO's is a tau, and its bounding
// box centres perfectly while its ink does not, because the crossbar carries
// almost all the mass and the stem almost none. Measured on the 128px source,
// the alpha-weighted centroid sits 12.4% above and 2.1% left of centre, so
// box-centred it reads high and slightly left.
//
// The correction is deliberately PARTIAL (45% of the measured offset). The
// eye judges a letterform by its extent as well as its mass, so nudging all
// the way to the centroid overshoots and drops the mark visibly low. Same
// instinct as the entasis on a Roman column: bend it off true so it looks
// true. Numbers are measurable, not taste: alpha-weight the source PNG, take
// the centroid, nudge back by 45% of the miss.
const OPTICAL_NUDGE: Record<string, { x: number; y: number }> = {
  tao: { x: 0.0094, y: 0.0557 },
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
  const nudge = OPTICAL_NUDGE[key];
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
        ...(nudge
          ? {
              transform: `translate(${(nudge.x * size).toFixed(2)}px, ${(nudge.y * size).toFixed(2)}px)`,
            }
          : {}),
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

// "Ⓣ TAO ⇄ ₿ BTC" — a pair name, each ticker carrying its own logo. Both
// legs are explicit: with two hubs, no side is implied.
export const PairLabel: React.FC<{
  from: string;
  to: string;
  logoSize?: number;
}> = ({ from, to, logoSize = 15 }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.6,
      whiteSpace: 'nowrap',
    }}
  >
    <TickerSymbol chain={from} logoSize={logoSize} />
    <Box component="span" sx={{ color: 'text.disabled' }}>
      ⇄
    </Box>
    <TickerSymbol chain={to} logoSize={logoSize} />
  </Box>
);
