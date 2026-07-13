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

// Marquee speed. The duration is derived from the measured content width so both
// strips scroll at the same pixels/second — a fixed duration made the wider
// dashboard strip (it carries the EMA suffix) look faster than the narrower
// miners strip. ~25 px/s is a calm pace; MIN keeps very narrow content sane.
const PX_PER_SEC = 25;
const MIN_DURATION_SEC = 8;

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

  // Measure one copy's width and set the duration to width / PX_PER_SEC, so the
  // marquee holds a constant visual speed no matter how wide the segments are.
  const copyRef = React.useRef<HTMLDivElement>(null);
  const [durationSec, setDurationSec] = React.useState(20);
  React.useEffect(() => {
    if (reduced) return;
    const el = copyRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setDurationSec(Math.max(MIN_DURATION_SEC, w / PX_PER_SEC));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [reduced]);

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
              // GPU-composited so the miner header's per-second "last refresh"
              // re-render can't stutter the scroll (main-thread reflow jitter).
              willChange: 'transform',
              animationName: 'aw-ticker',
              animationDuration: `${durationSec}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationPlayState: paused ? 'paused' : 'running',
              '@keyframes aw-ticker': {
                from: { transform: 'translate3d(0, 0, 0)' },
                to: { transform: 'translate3d(-50%, 0, 0)' },
              },
            }}
          >
            <Box ref={copyRef} sx={COPY_SX}>
              {items}
            </Box>
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
