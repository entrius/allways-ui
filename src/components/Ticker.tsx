import React from 'react';
import { Box, Stack, useMediaQuery } from '@mui/material';

// Rate-strip layout. Desktop (sm+) is the original wrapping row, untouched.
// Mobile (xs) becomes an auto-scrolling marquee — the four direction segments
// loop across one line so the strip never stacks into a tall column. Tap
// toggles pause so a moving rate can be read, and prefers-reduced-motion
// degrades to a static, hand-scrollable row (no animation at all).
//
// Shared by the dashboard (RatesTicker) and the miners page (StickyNetworkHeader)
// so the two strips scroll identically.

const GAP = 2; // theme spacing between segments

// One pass of the segments. Two identical copies sit in the animated track and
// the transform slides exactly one copy-width (-50%), so the loop is seamless
// regardless of how wide the content is.
const COPY_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: GAP,
  pr: GAP,
  '& > *': { flexShrink: 0 },
} as const;

const Ticker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const items = React.Children.toArray(children);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [paused, setPaused] = React.useState(false);

  return (
    <>
      {/* Desktop / tablet: the original wrapping row. */}
      <Stack
        direction="row"
        alignItems="center"
        sx={{ display: { xs: 'none', sm: 'flex' }, flexWrap: 'wrap', gap: 3 }}
      >
        {items}
      </Stack>

      {/* Mobile: marquee, or a static swipeable row when motion is reduced. */}
      <Box
        onClick={reduced ? undefined : () => setPaused((p) => !p)}
        sx={{
          display: { xs: 'block', sm: 'none' },
          width: '100%',
          overflowX: reduced ? 'auto' : 'hidden',
          WebkitOverflowScrolling: 'touch',
          // Fade both edges so a clipped segment reads as "more to scroll",
          // not cut off. Skipped in the static case (nothing is clipped mid-item).
          maskImage: reduced
            ? undefined
            : 'linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%)',
        }}
      >
        {reduced ? (
          <Box sx={{ ...COPY_SX, whiteSpace: 'nowrap' }}>{items}</Box>
        ) : (
          <Box
            sx={{
              display: 'inline-flex',
              width: 'max-content',
              animation: 'aw-ticker 20s linear infinite',
              animationPlayState: paused ? 'paused' : 'running',
              '@keyframes aw-ticker': {
                from: { transform: 'translateX(0)' },
                to: { transform: 'translateX(-50%)' },
              },
            }}
          >
            <Box sx={COPY_SX}>{items}</Box>
            <Box aria-hidden sx={COPY_SX}>
              {items}
            </Box>
          </Box>
        )}
      </Box>
    </>
  );
};

export default Ticker;
