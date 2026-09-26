import React, { useEffect, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import { FONTS } from '../theme';
import {
  chainInfo,
  chainList,
  isToken,
  nativeOf,
  type ChainInfo,
} from '../api/models/chains';

// Logo PNGs are served by das (same assets as its OG cards); the registry
// entry carries the path. Unknown chains — or a failed image load — fall back
// to a lettered disc so layouts never break.
const logoSrc = (chain: string): string | undefined => {
  const info = chainInfo(chain);
  const path = info?.logo;
  if (!path) return undefined;
  // An alpha whose owner published no logo draws its glyph without asking; one
  // whose link is dead gets a 404 (fallback=none) and draws it on error.
  if (info.glyph && info.ownerLogo === false) return undefined;
  const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
  const url = baseUrl ? `${baseUrl}${path}` : path;
  return info.glyph
    ? `${url}${url.includes('?') ? '&' : '?'}fallback=none`
    : url;
};

// Where a glyph's ink actually sits, measured once per glyph and font: its ink
// box and ink centroid, in units of the font size, relative to the pen origin.
interface Ink {
  left: number;
  right: number;
  top: number;
  bottom: number;
  cx: number;
}
const INK = new Map<string, Ink | null>();
const MEASURE_PX = 100;
const GLYPH_WEIGHT = 500;

const measureInk = (glyph: string, font: string): Ink | null => {
  const key = `${font}|${glyph}`;
  if (INK.has(key)) return INK.get(key) ?? null;
  const w = MEASURE_PX * 3;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = w;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.font = `${GLYPH_WEIGHT} ${MEASURE_PX}px ${font}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(glyph, MEASURE_PX, MEASURE_PX * 2);
  const { data } = ctx.getImageData(0, 0, w, w);
  let minX = w,
    maxX = -1,
    minY = w,
    maxY = -1,
    sum = 0,
    sx = 0;
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (!a) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      sum += a;
      sx += a * x;
    }
  const ink =
    maxX < 0
      ? null
      : {
          left: (minX - MEASURE_PX) / MEASURE_PX,
          right: (maxX + 1 - MEASURE_PX) / MEASURE_PX,
          top: (minY - MEASURE_PX * 2) / MEASURE_PX,
          bottom: (maxY + 1 - MEASURE_PX * 2) / MEASURE_PX,
          cx: (sx / sum - MEASURE_PX) / MEASURE_PX,
        };
  INK.set(key, ink);
  return ink;
};

// A subnet's alpha glyph (α, ε, ת) standing in for a logo, in the label's
// colour. Fitted by eye, not by the em box, the way a column is
// cut crooked so it reads straight:
// - size: every glyph gets the same ink mass (ι and ω carry equal weight),
//   capped so none outgrows the slot a logo would fill;
// - across: the ink sits halfway between its box centre and its centroid, so
//   lopsided letters (ג, ר) hang on the slot's axis and a column of them reads
//   as one straight line;
// - up/down: the ink box, not the em box, is centred in the slot, so a
//   descender (μ, ρ) or a hanging Hebrew letter sits level with the ticker's
//   capitals the way a box-centred logo does (see the tau note above).
// Web fonts arrive after first paint, and a glyph measured in the fallback
// face would be fitted wrong: wait for them once, for every glyph on the page.
const fontsReady: Promise<unknown> =
  typeof document !== 'undefined' && document.fonts
    ? document.fonts.ready
    : Promise.resolve();

const fitGlyph = (glyph: string, size: number) => {
  const ink = measureInk(glyph, FONTS.body);
  if (!ink) return null;
  const w = ink.right - ink.left;
  const h = ink.bottom - ink.top;
  const fontSize = Math.min(
    (size * 0.66) / Math.sqrt(w * h),
    (size * 0.92) / h,
    size / w,
  );
  const inkCx = ((ink.left + ink.right) / 2 + ink.cx) / 2;
  const inkCy = (ink.top + ink.bottom) / 2;
  return {
    fontSize,
    x: size / 2 - inkCx * fontSize,
    y: size / 2 - inkCy * fontSize,
  };
};

const AlphaGlyph: React.FC<{ glyph: string; size: number }> = ({
  glyph,
  size,
}) => {
  const [fit, setFit] = useState<ReturnType<typeof fitGlyph>>(null);
  useEffect(() => {
    let live = true;
    fontsReady.then(() => live && setFit(fitGlyph(glyph, size)));
    return () => {
      live = false;
    };
  }, [glyph, size]);

  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        position: 'relative',
        display: 'inline-block',
        width: size,
        height: size,
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      {fit && (
        <svg
          width={size}
          height={size}
          overflow="visible"
          style={{ position: 'absolute', inset: 0 }}
        >
          <text
            x={fit.x}
            y={fit.y}
            fontSize={fit.fontSize}
            fontFamily={FONTS.body}
            fontWeight={GLYPH_WEIGHT}
            fill="currentColor"
          >
            {glyph}
          </text>
        </svg>
      )}
    </Box>
  );
};

// No optical nudge: the tau's ink (rows 19 to 103 of the 128px source) is
// already centred in its box, and a mark shifted toward its centroid sat a
// pixel below the ticker text beside it. Box-centred, it lines up with the
// text's capitals.

// Marks that are monochrome DARK and therefore disappear on the dark-mode
// background. Measured on the source PNGs: TAO's tau is pure black (ink
// luminance 0.0 against a #090b0d page), so unfiltered it renders as an
// empty hole. Flipping it to white in dark mode matches what the theme
// already does for this asset elsewhere (palette assetTao is woodsmoke in
// light, white in dark).
//
// brightness(0) then invert(1) forces every ink pixel to white regardless of
// its original colour, which is right for a single-colour glyph and wrong for
// anything with real colour in it — so this stays an explicit list, never a
// blanket rule. Next closest is QNT at luminance 46; it survives because its
// glyph is white on a dark disc, so something still reads.
const DARK_MODE_INVERT = new Set(['tao']);
// Subnet alphas are never flipped: das serves the owner's own logo (often in
// colour), and without one the alpha's glyph is drawn as text in the label's colour.

export const ChainLogo: React.FC<{ chain: string; size?: number }> = ({
  chain,
  size = 16,
}) => {
  const [failed, setFailed] = useState(false);
  const isDark = useTheme().palette.mode === 'dark';
  const key = chain.toLowerCase();
  const src = logoSrc(key);
  const glyph = chainInfo(key)?.glyph;
  if ((!src || failed) && glyph)
    return <AlphaGlyph glyph={glyph} size={size} />;
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
  const invert = isDark && DARK_MODE_INVERT.has(key);
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
        ...(invert ? { filter: 'brightness(0) invert(1)' } : {}),
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

// Badge art for networks das lists no native coin for. Served from /public.
const LOCAL_NETWORK_BADGES: Record<string, string> = {
  Arbitrum: '/networks/arbitrum.png',
  Base: '/networks/base.svg',
};

// Small network mark on a token's logo, bottom-right, ringed in the page
// tone so it reads as a separate mark. Nothing for a native coin.
export const NetworkBadge: React.FC<{
  chain: ChainInfo;
  chains: ChainInfo[];
  logoSize: number;
}> = ({ chain, chains, logoSize }) => {
  if (!isToken(chain, chains)) return null;
  const native = nativeOf(chain, chains);
  const local = chain.network ? LOCAL_NETWORK_BADGES[chain.network] : undefined;
  if (!native && !local) return null;
  const size = Math.round(logoSize * 0.5);
  return (
    <Box
      sx={{
        position: 'absolute',
        right: -3,
        bottom: -2,
        width: size,
        height: size,
        borderRadius: '50%',
        boxShadow: (t) => `0 0 0 1.5px ${t.palette.background.default}`,
        backgroundColor: 'background.default',
        lineHeight: 0,
      }}
    >
      {native ? (
        <ChainLogo chain={native.id} size={size} />
      ) : (
        <Box
          component="img"
          src={local}
          alt=""
          draggable={false}
          sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            display: 'block',
          }}
        />
      )}
    </Box>
  );
};

// The asset's full mark: its logo with the network badge a token carries on
// the matrix, so USDC on Base wears Base's mark wherever it appears.
export const AssetMark: React.FC<{ chain: string; size?: number }> = ({
  chain,
  size = 16,
}) => {
  const chains = chainList();
  const info = chainInfo(chain);
  return (
    <Box
      component="span"
      sx={{
        position: 'relative',
        display: 'inline-flex',
        lineHeight: 0,
        flexShrink: 0,
      }}
    >
      <ChainLogo chain={chain} size={size} />
      {info && <NetworkBadge chain={info} chains={chains} logoSize={size} />}
    </Box>
  );
};
